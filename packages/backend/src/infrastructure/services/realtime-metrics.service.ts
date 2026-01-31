import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from '../../modules/notifications/notifications.gateway';

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
  private readonly logger = new Logger(RealtimeMetricsService.name);
  private readonly metricsCache = new Map<string, SalesMetrics>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Calculate and broadcast sales metrics for an outlet
   */
  async broadcastSalesMetrics(outletId: string, businessId: string): Promise<SalesMetrics | null> {
    try {
      const metrics = await this.calculateSalesMetrics(outletId);

      if (!metrics) {
        return null;
      }

      // Broadcast to business room for real-time dashboard
      this.notificationsGateway.sendToBusiness(businessId, 'sales:metrics_update', {
        outletId,
        metrics,
        timestamp: new Date(),
      });

      // Also broadcast to outlet room
      this.notificationsGateway.sendToOutlet(outletId, 'sales:metrics_update', {
        outletId,
        metrics,
        timestamp: new Date(),
      });

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to broadcast sales metrics for outlet ${outletId}:`, error);
      return null;
    }
  }

  /**
   * Calculate sales metrics for today
   */
  async calculateSalesMetrics(outletId: string): Promise<SalesMetrics | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Get all completed transactions for today
      const transactions = await this.prisma.transaction.findMany({
        where: {
          outletId,
          status: 'completed',
          createdAt: {
            gte: today,
            lte: endOfToday,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      });

      if (transactions.length === 0) {
        return this.getEmptyMetrics(outletId, today, endOfToday);
      }

      const totalSales = transactions.reduce((sum, tx) => {
        const grandTotal = (tx as { grandTotal: { toNumber: () => number } }).grandTotal;
        return sum + grandTotal.toNumber();
      }, 0);

      const transactionCount = transactions.length;
      const averageOrderValue = totalSales / transactionCount;

      // Calculate top products
      const productSales = new Map<string, { quantity: number; revenue: number }>();

      for (const tx of transactions) {
        for (const item of tx.items) {
          const productName = item.productName;
          const quantity = (item as { quantity: { toNumber: () => number } }).quantity.toNumber();
          const subtotal = (item as { subtotal: { toNumber: () => number } }).subtotal.toNumber();

          const existing = productSales.get(productName) || { quantity: 0, revenue: 0 };
          productSales.set(productName, {
            quantity: existing.quantity + quantity,
            revenue: existing.revenue + subtotal,
          });
        }
      }

      const topProducts = Array.from(productSales.entries())
        .map(([productName, data]) => ({
          productName,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate payment method distribution
      const paymentMethodSales = new Map<string, number>();

      for (const tx of transactions) {
        for (const payment of tx.payments) {
          const amount = (payment as { amount: { toNumber: () => number } }).amount.toNumber();
          const method = payment.paymentMethod;
          const existing = paymentMethodSales.get(method) || 0;
          paymentMethodSales.set(method, existing + amount);
        }
      }

      const paymentMethods = Array.from(paymentMethodSales.entries()).map(([method, amount]) => ({
        method,
        amount,
        percentage: (amount / totalSales) * 100,
      }));

      const metrics: SalesMetrics = {
        outletId,
        totalSales,
        transactionCount,
        averageOrderValue,
        topProducts,
        paymentMethods,
        period: {
          start: today,
          end: endOfToday,
        },
      };

      // Cache the metrics
      this.metricsCache.set(outletId, metrics);

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to calculate sales metrics for outlet ${outletId}:`, error);
      return null;
    }
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

    const metrics = new Map<string, SalesMetrics>();

    for (const outlet of outlets) {
      const outletMetrics = await this.calculateSalesMetrics(outlet.id);
      if (outletMetrics) {
        metrics.set(outlet.id, outletMetrics);
      }
    }

    return metrics;
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
