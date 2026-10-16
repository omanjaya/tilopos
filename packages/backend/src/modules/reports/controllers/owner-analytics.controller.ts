import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { businessDayRange } from '@shared/utils/business-time';
import { money } from '@shared/utils/money';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { computeProfit } from '../utils/profit.util';

/**
 * Owner Analytics Controller
 * Provides business-wide analytics across all outlets for business owners.
 */
@ApiTags('Owner Analytics')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
@Controller('owner/analytics')
export class OwnerAnalyticsController {
  private readonly CACHE_TTL = 60; // 1 minute for real-time dashboard

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Business-wide overview metrics (all outlets)' })
  async getOverview(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `owner:analytics:overview:${user.businessId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const outletIds = await this.tenant.resolveOutletIds(user);

    if (outletIds.length === 0) {
      return {
        totalSales: 0,
        totalProfit: 0,
        totalTransactions: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        outletsCount: 0,
      };
    }

    const whereClause = {
      outletId: { in: outletIds },
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    const [aggregate, refunds, customerCount, totalCost] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: whereClause,
        _sum: { grandTotal: true, subtotal: true, discountAmount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { ...whereClause, transactionType: 'refund' },
        _sum: { subtotal: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['customerId'],
        where: { ...whereClause, customerId: { not: null } },
      }),
      // COGS in SQL instead of loading every item (F1019)
      this.queries.cogs({ outletIds, start, end }),
    ]);

    const totalSales = aggregate._sum.grandTotal?.toNumber() || 0;
    const totalTransactions = aggregate._count;
    const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Profit = net sales excl. tax, net of refunds - COGS (F1020)
    const profit = computeProfit({
      grossSales: aggregate._sum.subtotal,
      discounts: aggregate._sum.discountAmount,
      refunds: money(refunds._sum.subtotal).abs(),
      cogs: totalCost,
    });

    const result = {
      totalSales,
      totalProfit: profit.netProfit,
      totalTransactions,
      totalCustomers: customerCount.length,
      averageOrderValue,
      outletsCount: outletIds.length,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('outlets-comparison')
  @ApiOperation({ summary: 'Compare performance across all outlets' })
  async getOutletsComparison(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `owner:analytics:outlets-comparison:${user.businessId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });
    const outletNames = new Map(outlets.map((o) => [o.id, o.name]));

    const groupedData =
      outlets.length > 0
        ? await this.prisma.transaction.groupBy({
            by: ['outletId'],
            where: {
              outletId: { in: outlets.map((o) => o.id) },
              transactionType: 'sale',
              status: 'completed',
              createdAt: { gte: start, lte: end },
            },
            _sum: { grandTotal: true },
            _count: true,
          })
        : [];

    const outletPerformance = groupedData.map((group) => {
      const sales = group._sum.grandTotal?.toNumber() || 0;
      const transactions = group._count;
      return {
        outletId: group.outletId,
        outletName: outletNames.get(group.outletId) || 'Unknown',
        sales,
        transactions,
        avgOrderValue: transactions > 0 ? sales / transactions : 0,
      };
    });

    outletPerformance.sort((a, b) => b.sales - a.sales);

    const result = { outlets: outletPerformance };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('critical-alerts')
  @ApiOperation({ summary: 'Get critical business alerts and issues' })
  async getCriticalAlerts(@CurrentUser() user: AuthUser) {
    const alerts: Array<{
      type: 'low_stock' | 'stuck_transfer' | 'no_sales' | 'high_refunds' | 'inactive_outlet';
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      outletId?: string;
      outletName?: string;
      count?: number;
    }> = [];

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // 1. Low stock: each row against its own lowStockAlert, counted in SQL (F1023/F1024)
    const lowStockCount = await this.queries.lowStockCount(outletIds);

    if (lowStockCount > 0) {
      alerts.push({
        type: 'low_stock',
        severity: 'warning',
        title: `${lowStockCount} produk stok rendah`,
        description: `Beberapa produk berada di bawah batas stok minimum`,
        count: lowStockCount,
      });
    }

    // 2. Stuck transfers (approved > 24h but not shipped) — count only
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stuckTransfers = await this.prisma.stockTransfer.count({
      where: {
        businessId: user.businessId,
        sourceOutletId: { in: outletIds },
        status: 'approved',
        approvedAt: { lt: dayAgo },
      },
    });

    if (stuckTransfers > 0) {
      alerts.push({
        type: 'stuck_transfer',
        severity: 'critical',
        title: `${stuckTransfers} transfer terhambat`,
        description: `Transfer telah disetujui >24 jam namun belum dikirim`,
        count: stuckTransfers,
      });
    }

    // 3. Outlets with no sales today — WIB business day (F1021), one groupBy (F1022)
    const today = businessDayRange();
    const salesToday =
      outletIds.length > 0
        ? await this.prisma.transaction.groupBy({
            by: ['outletId'],
            where: {
              outletId: { in: outletIds },
              transactionType: 'sale',
              status: 'completed',
              createdAt: { gte: today.start, lte: today.end },
            },
            _count: true,
          })
        : [];
    const outletsWithSales = new Set(salesToday.map((s) => s.outletId));

    for (const outlet of outlets) {
      if (!outletsWithSales.has(outlet.id)) {
        alerts.push({
          type: 'no_sales',
          severity: 'warning',
          title: `Tidak ada penjualan hari ini`,
          description: `${outlet.name} belum mencatat penjualan`,
          outletId: outlet.id,
          outletName: outlet.name,
        });
      }
    }

    // 4. High refund rate (last 7 days, completed refunds only)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [refundCount, salesCount] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          outletId: { in: outletIds },
          transactionType: 'refund',
          status: 'completed',
          createdAt: { gte: weekAgo },
        },
      }),
      this.prisma.transaction.count({
        where: {
          outletId: { in: outletIds },
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    const refundRate = salesCount > 0 ? (refundCount / salesCount) * 100 : 0;
    if (refundRate > 5) {
      alerts.push({
        type: 'high_refunds',
        severity: 'warning',
        title: `Tingkat refund tinggi: ${refundRate.toFixed(1)}%`,
        description: `${refundCount} refund dalam 7 hari terakhir`,
        count: refundCount,
      });
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return { alerts };
  }

  @Get('real-time-metrics')
  @ApiOperation({ summary: 'Real-time metrics for live dashboard (no cache)' })
  async getRealTimeMetrics(@CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user);

    // Today = current WIB business day (F1021)
    const todayStart = businessDayRange().start;

    const whereClause = {
      outletId: { in: outletIds },
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: todayStart },
    };

    const lastHourStart = new Date(Date.now() - 60 * 60 * 1000);
    const [aggregate, lastHourAggregate, activeOrders] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: whereClause,
        _sum: { grandTotal: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { ...whereClause, createdAt: { gte: lastHourStart } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      this.prisma.order.count({
        where: {
          outletId: { in: outletIds },
          status: { in: ['pending', 'preparing', 'ready'] },
        },
      }),
    ]);

    return {
      todaySales: aggregate._sum.grandTotal?.toNumber() || 0,
      todayTransactions: aggregate._count,
      lastHourSales: lastHourAggregate._sum.grandTotal?.toNumber() || 0,
      lastHourTransactions: lastHourAggregate._count,
      activeOrders,
      outletsCount: outletIds.length,
      timestamp: new Date().toISOString(),
    };
  }
}
