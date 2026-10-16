import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from '../../modules/notifications/notifications.gateway';
import { businessDayRange } from '../../shared/utils/business-time';
import { money, roundRupiah, toNumber } from '../../shared/utils/money';

export interface SalesMetrics {
  outletId: string;
  totalSales: number;
  transactionCount: number;
  averageOrderValue: number;
  topProducts: Array<{ productName: string; quantity: number; revenue: number }>;
  paymentMethods: Array<{ method: string; amount: number; percentage: number }>;
  period: {
    start: Date;
    end: Date;
  };
}

export interface LiveDashboardUpdate {
  outletId: string;
  metrics: SalesMetrics;
  timestamp: Date;
}

@Injectable()
export class RealtimeMetricsService {
  private readonly metricsCache = new Map<string, SalesMetrics>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Calculate and broadcast sales metrics for an outlet. Errors propagate to the caller.
   */
  async broadcastSalesMetrics(outletId: string, businessId: string): Promise<SalesMetrics> {
    const metrics = await this.calculateSalesMetrics(outletId);
    const payload = { outletId, metrics, timestamp: new Date() };

    // Broadcast to business room for real-time dashboard, and to the outlet room
    this.notificationsGateway.sendToBusiness(businessId, 'sales:metrics_update', payload);
    this.notificationsGateway.sendToOutlet(outletId, 'sales:metrics_update', payload);

    return metrics;
  }

  /**
   * Calculate sales metrics for the current business day (Asia/Jakarta).
   * Only completed sales count; refunds are excluded. Aggregation happens in the database.
   */
  async calculateSalesMetrics(outletId: string): Promise<SalesMetrics> {
    const { start, end } = businessDayRange();
    const txWhere: Prisma.TransactionWhereInput = {
      outletId,
      status: 'completed',
      transactionType: 'sale',
      createdAt: { gte: start, lte: end },
    };

    const [totals, productGroups, paymentGroups] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: txWhere,
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),
      this.prisma.transactionItem.groupBy({
        by: ['productName'],
        where: { transaction: txWhere },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 5,
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { transaction: txWhere },
        _sum: { amount: true },
      }),
    ]);

    const transactionCount = totals._count._all;
    if (transactionCount === 0) {
      return this.getEmptyMetrics(outletId, start, end);
    }

    const totalSalesDec = money(totals._sum.grandTotal);
    const totalSales = toNumber(totalSalesDec);

    const metrics: SalesMetrics = {
      outletId,
      totalSales,
      transactionCount,
      averageOrderValue: toNumber(roundRupiah(totalSalesDec.dividedBy(transactionCount))),
      topProducts: productGroups.map((g) => ({
        productName: g.productName,
        quantity: toNumber(g._sum.quantity),
        revenue: toNumber(g._sum.subtotal),
      })),
      paymentMethods: paymentGroups.map((g) => {
        const amount = money(g._sum.amount);
        return {
          method: g.paymentMethod,
          amount: toNumber(amount),
          percentage: totalSalesDec.isZero()
            ? 0
            : toNumber(amount.times(100).dividedBy(totalSalesDec).toDecimalPlaces(2)),
        };
      }),
      period: { start, end },
    };

    // Cache the metrics
    this.metricsCache.set(outletId, metrics);

    return metrics;
  }

  /**
   * Get cached metrics if available and not expired
   */
  getCachedMetrics(outletId: string): SalesMetrics | null {
    return this.metricsCache.get(outletId) || null;
  }

  /**
   * Get metrics for multiple outlets (for manager dashboard)
   */
  async getBusinessMetrics(businessId: string): Promise<Map<string, SalesMetrics>> {
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId },
      select: { id: true },
    });

    const results = await Promise.all(
      outlets.map(
        async (outlet) => [outlet.id, await this.calculateSalesMetrics(outlet.id)] as const,
      ),
    );
    return new Map(results);
  }

  /**
   * Broadcast metrics for all outlets in a business
   */
  async broadcastBusinessMetrics(businessId: string): Promise<void> {
    const metrics = await this.getBusinessMetrics(businessId);

    const metricsArray = Array.from(metrics.entries()).map(([outletId, outletMetrics]) => ({
      outletId,
      metrics: outletMetrics,
    }));

    this.notificationsGateway.sendToBusiness(businessId, 'sales:business_metrics_update', {
      businessId,
      outletMetrics: metricsArray,
      timestamp: new Date(),
    });
  }

  private getEmptyMetrics(outletId: string, start: Date, end: Date): SalesMetrics {
    return {
      outletId,
      totalSales: 0,
      transactionCount: 0,
      averageOrderValue: 0,
      topProducts: [],
      paymentMethods: [],
      period: {
        start,
        end,
      },
    };
  }
}
