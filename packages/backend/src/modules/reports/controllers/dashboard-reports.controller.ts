import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports/dashboard')
export class DashboardReportsController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary with KPIs, day-of-week and hourly breakdown' })
  async dashboardSummary(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true, businessId: true },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${outletId} not found`);
    }
    if (outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:dashboard:summary:${outletId}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const whereClause = {
      outletId,
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    // Aggregate KPIs
    const aggregate = await this.prisma.transaction.aggregate({
      where: whereClause,
      _sum: { grandTotal: true, subtotal: true },
      _count: true,
    });

    const grossSales = aggregate._sum.subtotal?.toNumber() || 0;
    const netSales = aggregate._sum.grandTotal?.toNumber() || 0;
    const transactions = aggregate._count;
    const averageSalePerTransaction = transactions > 0 ? netSales / transactions : 0;

    // Compute cost from transaction items via product's costPrice
    const txItems = await this.prisma.transactionItem.findMany({
      where: { transaction: whereClause },
      select: {
        quantity: true,
        product: { select: { costPrice: true } },
      },
    });
    const totalCost = txItems.reduce(
      (sum, item) => sum + (item.product?.costPrice?.toNumber() || 0) * item.quantity.toNumber(),
      0,
    );
    const grossProfit = grossSales - totalCost;
    const grossMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0;

    // Fetch transactions for day-of-week and hourly breakdown
    const txns = await this.prisma.transaction.findMany({
      where: whereClause,
      select: { createdAt: true, subtotal: true, grandTotal: true },
    });

    // Day of week breakdown (0=Minggu, 1=Senin, ..., 6=Sabtu)
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayMap = new Map<number, { grossSales: number; numSales: number }>();
    for (let d = 0; d < 7; d++) {
      dayMap.set(d, { grossSales: 0, numSales: 0 });
    }

    // Hourly breakdown (0-23)
    const hourMap = new Map<number, { grossSales: number; numSales: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { grossSales: 0, numSales: 0 });
    }

    for (const tx of txns) {
      const day = tx.createdAt.getDay();
      const hour = tx.createdAt.getHours();
      const amount = tx.subtotal?.toNumber() || 0;

      const dayEntry = dayMap.get(day)!;
      dayEntry.grossSales += amount;
      dayEntry.numSales += 1;

      const hourEntry = hourMap.get(hour)!;
      hourEntry.grossSales += amount;
      hourEntry.numSales += 1;
    }

    const salesByDayOfWeek = Array.from(dayMap.entries()).map(([day, data]) => ({
      day,
      dayName: dayNames[day],
      grossSales: data.grossSales,
      numSales: data.numSales,
    }));

    const salesByHour = Array.from(hourMap.entries()).map(([hour, data]) => ({
      hour,
      grossSales: data.grossSales,
      numSales: data.numSales,
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
  async dashboardItems(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true, businessId: true },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${outletId} not found`);
    }
    if (outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:dashboard:items:${outletId}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const whereClause = {
      transaction: {
        outletId,
        transactionType: 'sale' as const,
        status: 'completed' as const,
        createdAt: { gte: start, lte: end },
      },
    };

    const items = await this.prisma.transactionItem.findMany({
      where: whereClause,
      select: {
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
        product: {
          select: {
            category: { select: { name: true } },
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<string, { productId: string; name: string; category: string; quantitySold: number; grossSales: number }>();
    for (const item of items) {
      const key = item.productId ?? item.productName;
      const existing = productMap.get(key);
      const category = item.product?.category?.name ?? 'Tanpa Kategori';
      const qty = item.quantity.toNumber();
      if (existing) {
        existing.quantitySold += qty;
        existing.grossSales += item.subtotal?.toNumber() || 0;
      } else {
        productMap.set(key, {
          productId: item.productId ?? '',
          name: item.productName,
          category,
          quantitySold: qty,
          grossSales: item.subtotal?.toNumber() || 0,
        });
      }
    }

    const allProducts = Array.from(productMap.values());
    const topItems = [...allProducts].sort((a, b) => b.grossSales - a.grossSales).slice(0, 20);

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
    const catProductMap = new Map<string, { name: string; quantitySold: number; grossSales: number }[]>();
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
  async outletComparison(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:dashboard:outlet-comparison:${user.businessId}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const outletMetrics = await Promise.all(
      outlets.map(async (outlet) => {
        const whereClause = {
          outletId: outlet.id,
          transactionType: 'sale' as const,
          status: 'completed' as const,
          createdAt: { gte: start, lte: end },
        };

        const agg = await this.prisma.transaction.aggregate({
          where: whereClause,
          _sum: { grandTotal: true, subtotal: true },
          _count: true,
        });

        const grossSales = agg._sum.subtotal?.toNumber() || 0;
        const netSales = agg._sum.grandTotal?.toNumber() || 0;
        const txCount = agg._count;
        const averageSale = txCount > 0 ? netSales / txCount : 0;

        // Fetch items for cost + top items
        const txItems = await this.prisma.transactionItem.findMany({
          where: { transaction: whereClause },
          select: {
            productId: true,
            productName: true,
            quantity: true,
            subtotal: true,
            product: { select: { costPrice: true } },
          },
        });

        // Cost via product's costPrice
        const totalCost = txItems.reduce(
          (sum, item) => sum + (item.product?.costPrice?.toNumber() || 0) * item.quantity.toNumber(),
          0,
        );
        const grossProfit = grossSales - totalCost;
        const grossMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0;

        // Top 3 items by sales
        const itemMap = new Map<string, { name: string; grossSales: number; quantity: number }>();
        for (const ti of txItems) {
          const key = ti.productId ?? ti.productName;
          const existing = itemMap.get(key);
          const qty = ti.quantity.toNumber();
          const sales = ti.subtotal?.toNumber() || 0;
          if (existing) {
            existing.grossSales += sales;
            existing.quantity += qty;
          } else {
            itemMap.set(key, { name: ti.productName, grossSales: sales, quantity: qty });
          }
        }
        const topItems = Array.from(itemMap.values())
          .sort((a, b) => b.grossSales - a.grossSales)
          .slice(0, 3)
          .map((i) => ({ name: i.name, grossSales: i.grossSales, quantity: i.quantity }));

        return {
          outletId: outlet.id,
          outletName: outlet.name,
          grossSales,
          netSales,
          transactions: txCount,
          averageSale,
          grossProfit,
          grossMargin,
          topItems,
        };
      }),
    );

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
