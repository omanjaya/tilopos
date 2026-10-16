import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { money, toNumber } from '@shared/utils/money';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';
import { canViewCostData } from '../utils/report-access';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** Upper bound of distinct products used for the category breakdown (R13). */
const MAX_DASHBOARD_PRODUCTS = 2000;

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports/dashboard')
export class DashboardReportsController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary with KPIs, day-of-week and hourly breakdown' })
  async dashboardSummary(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, query.startDate, query.endDate);
    const showCost = canViewCostData(user.role);

    const cacheKey = `report:dashboard:summary:${outletId}:${query.startDate}:${query.endDate}:${showCost ? 'c' : 'n'}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const scope = { outletIds: [outletId], start, end };
    const [aggregate, totalCost, byWeekday, byHour] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          outletId,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: { grandTotal: true, subtotal: true, discountAmount: true },
        _count: true,
      }),
      showCost ? this.queries.cogs(scope) : Promise.resolve(0),
      this.queries.salesByWeekday(scope, 'subtotal'),
      this.queries.salesByHour(scope, 'subtotal'),
    ]);

    const grossSalesDec = money(aggregate._sum.subtotal);
    const netSalesDec = grossSalesDec.minus(money(aggregate._sum.discountAmount));
    const grossSales = toNumber(grossSalesDec);
    const netSales = toNumber(netSalesDec);
    const transactions = aggregate._count;
    const averageSalePerTransaction = transactions > 0 ? netSales / transactions : 0;

    // Gross profit = net sales (after discount, excl. tax) - COGS
    const grossProfit = showCost ? toNumber(netSalesDec.minus(money(totalCost))) : null;
    const grossMargin =
      grossProfit === null ? null : netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // Day of week (0=Minggu) and hour (0-23) in WIB (R14)
    const weekdayMap = new Map(byWeekday.map((r) => [Number(r.bucket), r]));
    const hourMap = new Map(byHour.map((r) => [Number(r.bucket), r]));

    const salesByDayOfWeek = DAY_NAMES.map((dayName, day) => ({
      day,
      dayName,
      grossSales: weekdayMap.get(day)?.amount ?? 0,
      numSales: weekdayMap.get(day)?.count ?? 0,
    }));

    const salesByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      grossSales: hourMap.get(hour)?.amount ?? 0,
      numSales: hourMap.get(hour)?.count ?? 0,
    }));

    const result = {
      grossSales,
      netSales,
      grossProfit,
      transactions,
      averageSalePerTransaction,
      grossMargin,
      salesByDayOfWeek,
      salesByHour,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('items')
  @ApiOperation({ summary: 'Dashboard item summary with top items and category breakdowns' })
  async dashboardItems(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, query.startDate, query.endDate);

    const cacheKey = `report:dashboard:items:${outletId}:${query.startDate}:${query.endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    // Aggregated per product in SQL (R13)
    const rows = await this.queries.itemSales(
      { outletIds: [outletId], start, end },
      { limit: MAX_DASHBOARD_PRODUCTS },
    );

    const allProducts = rows.map((r) => ({
      productId: r.productId ?? '',
      name: r.productName,
      category: r.categoryName ?? 'Tanpa Kategori',
      quantitySold: r.quantity,
      grossSales: r.revenue,
    }));

    const topItems = allProducts.slice(0, 20);

    // Aggregate by category
    const categoryMap = new Map<string, { totalQuantity: number; totalSales: number }>();
    for (const p of allProducts) {
      const existing = categoryMap.get(p.category);
      if (existing) {
        existing.totalQuantity += p.quantitySold;
        existing.totalSales += p.grossSales;
      } else {
        categoryMap.set(p.category, { totalQuantity: p.quantitySold, totalSales: p.grossSales });
      }
    }

    const totalQty = allProducts.reduce((s, p) => s + p.quantitySold, 0);
    const totalSales = allProducts.reduce((s, p) => s + p.grossSales, 0);

    const categoryByVolume = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalQuantity: data.totalQuantity,
        percentage: totalQty > 0 ? (data.totalQuantity / totalQty) * 100 : 0,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const categoryBySales = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalSales: data.totalSales,
        percentage: totalSales > 0 ? (data.totalSales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    // Top items by category
    const catProductMap = new Map<
      string,
      { name: string; quantitySold: number; grossSales: number }[]
    >();
    for (const p of allProducts) {
      const list = catProductMap.get(p.category) ?? [];
      list.push({ name: p.name, quantitySold: p.quantitySold, grossSales: p.grossSales });
      catProductMap.set(p.category, list);
    }

    const topItemsByCategory = Array.from(catProductMap.entries())
      .map(([category, catItems]) => ({
        category,
        items: catItems.sort((a, b) => b.grossSales - a.grossSales).slice(0, 5),
      }))
      .sort((a, b) => {
        const aSales = a.items.reduce((s, i) => s + i.grossSales, 0);
        const bSales = b.items.reduce((s, i) => s + i.grossSales, 0);
        return bSales - aSales;
      });

    const result = { topItems, categoryByVolume, categoryBySales, topItemsByCategory };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('outlet-comparison')
  @ApiOperation({ summary: 'Compare metrics across all outlets' })
  async outletComparison(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { start, end } = getDateRange(undefined, query.startDate, query.endDate);
    const showCost = canViewCostData(user.role);

    const cacheKey = `report:dashboard:outlet-comparison:${user.businessId}:${query.startDate}:${query.endDate}:${showCost ? 'c' : 'n'}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const outletIds = outlets.map((o) => o.id);
    const scope = { outletIds, start, end };

    // One grouped query per metric instead of per outlet (N+1, F0963)
    const [grouped, cogsByOutlet, topItemsByOutlet] = await Promise.all([
      outletIds.length > 0
        ? this.prisma.transaction.groupBy({
            by: ['outletId'],
            where: {
              outletId: { in: outletIds },
              transactionType: 'sale',
              status: 'completed',
              createdAt: { gte: start, lte: end },
            },
            _sum: { grandTotal: true, subtotal: true, discountAmount: true },
            _count: true,
          })
        : Promise.resolve([]),
      showCost ? this.queries.cogsByOutlet(scope) : Promise.resolve(new Map<string, number>()),
      this.queries.topItemsByOutlet(scope, 3),
    ]);
    const aggByOutlet = new Map(grouped.map((g) => [g.outletId, g]));

    const outletMetrics = outlets.map((outlet) => {
      const agg = aggByOutlet.get(outlet.id);
      const grossSalesDec = money(agg?._sum.subtotal);
      const netSalesDec = grossSalesDec.minus(money(agg?._sum.discountAmount));
      const grossSales = toNumber(grossSalesDec);
      const netSales = toNumber(netSalesDec);
      const txCount = agg?._count ?? 0;
      const averageSale = txCount > 0 ? netSales / txCount : 0;
      const grossProfit = showCost
        ? toNumber(netSalesDec.minus(money(cogsByOutlet.get(outlet.id) ?? 0)))
        : null;
      const grossMargin =
        grossProfit === null ? null : netSales > 0 ? (grossProfit / netSales) * 100 : 0;

      return {
        outletId: outlet.id,
        outletName: outlet.name,
        grossSales,
        netSales,
        transactions: txCount,
        averageSale,
        grossProfit,
        grossMargin,
        topItems: topItemsByOutlet.get(outlet.id) ?? [],
      };
    });

    const totals = {
      grossSales: outletMetrics.reduce((s, o) => s + o.grossSales, 0),
      netSales: outletMetrics.reduce((s, o) => s + o.netSales, 0),
      transactions: outletMetrics.reduce((s, o) => s + o.transactions, 0),
    };

    const result = { outlets: outletMetrics, totals };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
