import {
  Controller,
  Get,
  Query,
  UseGuards,
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

/**
 * Owner Analytics Controller
 * Provides business-wide analytics across all outlets for business owners.
 */
@ApiTags('Owner Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
@Controller('owner/analytics')
export class OwnerAnalyticsController {
  private readonly CACHE_TTL = 60; // 1 minute for real-time dashboard

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Business-wide overview metrics (all outlets)' })
  async getOverview(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Check cache
    const cacheKey = `owner:analytics:overview:${user.businessId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all outlet IDs for this business
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

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

    // Aggregate sales data
    const aggregate = await this.prisma.transaction.aggregate({
      where: whereClause,
      _sum: {
        grandTotal: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
      },
      _count: true,
    });

    const totalSales = aggregate._sum.grandTotal?.toNumber() || 0;
    const totalTransactions = aggregate._count;
    const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Count unique customers
    const customerCount = await this.prisma.transaction.groupBy({
      by: ['customerId'],
      where: { ...whereClause, customerId: { not: null } },
    });

    // Calculate total profit (sales - cost)
    const transactionsWithCost = await this.prisma.transaction.findMany({
      where: whereClause,
      select: {
        grandTotal: true,
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                costPrice: true,
              },
            },
          },
        },
      },
    });

    let totalCost = 0;
    for (const tx of transactionsWithCost) {
      for (const item of tx.items) {
        if (item.product?.costPrice) {
          totalCost += Number(item.quantity) * item.product.costPrice.toNumber();
        }
      }
    }

    const totalProfit = totalSales - totalCost;

    const result = {
      totalSales,
      totalProfit,
      totalTransactions,
      totalCustomers: customerCount.length,
      averageOrderValue,
      outletsCount: outlets.length,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('outlets-comparison')
  @ApiOperation({ summary: 'Compare performance across all outlets' })
  async getOutletsComparison(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Check cache
    const cacheKey = `owner:analytics:outlets-comparison:${user.businessId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all outlets with their transactions
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });

    const whereClause = {
      outletId: { in: outlets.map((o) => o.id) },
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    // Group by outlet
    const groupedData = await this.prisma.transaction.groupBy({
      by: ['outletId'],
      where: whereClause,
      _sum: { grandTotal: true },
      _count: true,
    });

    // Map to outlet details
    const outletPerformance = groupedData.map((group) => {
      const outlet = outlets.find((o) => o.id === group.outletId);
      const sales = group._sum.grandTotal?.toNumber() || 0;
      const transactions = group._count;
      const avgOrderValue = transactions > 0 ? sales / transactions : 0;

      return {
        outletId: group.outletId,
        outletName: outlet?.name || 'Unknown',
        sales,
        transactions,
        avgOrderValue,
      };
    });

    // Sort by sales descending
    outletPerformance.sort((a, b) => b.sales - a.sales);

    const result = { outlets: outletPerformance };

    // Cache result
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

    // Get all outlets
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // 1. Check for low stock items
    const lowStock = await this.prisma.stockLevel.findMany({
      where: {
        outletId: { in: outletIds },
        quantity: { lte: 10 }, // Threshold
      },
      include: {
        product: { select: { name: true } },
        outlet: { select: { name: true } },
      },
    });

    if (lowStock.length > 0) {
      alerts.push({
        type: 'low_stock',
        severity: 'warning',
        title: `${lowStock.length} produk stok rendah`,
        description: `Beberapa produk memiliki stok ≤ 10 unit`,
        count: lowStock.length,
      });
    }

    // 2. Check for stuck transfers (approved > 24h but not shipped)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stuckTransfers = await this.prisma.stockTransfer.findMany({
      where: {
        sourceOutletId: { in: outletIds },
        status: 'approved',
        approvedAt: { lt: dayAgo },
      },
      include: {
        sourceOutlet: { select: { name: true } },
        destinationOutlet: { select: { name: true } },
      },
    });

    if (stuckTransfers.length > 0) {
      alerts.push({
        type: 'stuck_transfer',
        severity: 'critical',
        title: `${stuckTransfers.length} transfer terhambat`,
        description: `Transfer telah disetujui >24 jam namun belum dikirim`,
        count: stuckTransfers.length,
      });
    }

    // 3. Check for outlets with no sales today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    for (const outlet of outlets) {
      const salesCount = await this.prisma.transaction.count({
        where: {
          outletId: outlet.id,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      });

      if (salesCount === 0) {
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

    // 4. Check for high refund rate (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const refundCount = await this.prisma.transaction.count({
      where: {
        outletId: { in: outletIds },
        transactionType: 'refund',
        createdAt: { gte: weekAgo },
      },
    });

    const salesCount = await this.prisma.transaction.count({
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: weekAgo },
      },
    });

    const refundRate = salesCount > 0 ? (refundCount / salesCount) * 100 : 0;
    if (refundRate > 5) { // >5% refund rate
      alerts.push({
        type: 'high_refunds',
        severity: 'warning',
        title: `Tingkat refund tinggi: ${refundRate.toFixed(1)}%`,
        description: `${refundCount} refund dalam 7 hari terakhir`,
        count: refundCount,
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return { alerts };
  }

  @Get('real-time-metrics')
  @ApiOperation({ summary: 'Real-time metrics for live dashboard (no cache)' })
  async getRealTimeMetrics(@CurrentUser() user: AuthUser) {
    // Get all outlet IDs
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // Today's data (no cache for real-time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const whereClause = {
      outletId: { in: outletIds },
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: todayStart },
    };

    const aggregate = await this.prisma.transaction.aggregate({
      where: whereClause,
      _sum: { grandTotal: true },
      _count: true,
    });

    const todaySales = aggregate._sum.grandTotal?.toNumber() || 0;
    const todayTransactions = aggregate._count;

    // Last hour sales
    const lastHourStart = new Date(Date.now() - 60 * 60 * 1000);
    const lastHourAggregate = await this.prisma.transaction.aggregate({
      where: {
        ...whereClause,
        createdAt: { gte: lastHourStart },
      },
      _sum: { grandTotal: true },
      _count: true,
    });

    const lastHourSales = lastHourAggregate._sum.grandTotal?.toNumber() || 0;
    const lastHourTransactions = lastHourAggregate._count;

    // Active tables/orders
    const activeOrders = await this.prisma.order.count({
      where: {
        outletId: { in: outletIds },
        status: { in: ['pending', 'preparing', 'ready'] },
      },
    });

    return {
      todaySales,
      todayTransactions,
      lastHourSales,
      lastHourTransactions,
      activeOrders,
      outletsCount: outlets.length,
      timestamp: new Date().toISOString(),
    };
  }
}
