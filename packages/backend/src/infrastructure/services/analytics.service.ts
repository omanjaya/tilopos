/**
 * Advanced Analytics & Business Intelligence Service
 *
 * Provides real-time metrics, trend analysis, and predictive insights
 * using actual database queries with Redis caching.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';

// Types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  itemsSold: number;
  discountGiven: number;
  taxCollected: number;
  revenueGrowth: number;
  transactionGrowth: number;
}

export interface ProductAnalytics {
  topSellingProducts: ProductPerformance[];
  lowPerformingProducts: ProductPerformance[];
  categoryBreakdown: CategorySales[];
  productMixAnalysis: ProductMix[];
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  profit: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export interface CategorySales {
  categoryId: string;
  categoryName: string;
  revenue: number;
  quantity: number;
  percentOfTotal: number;
  productCount: number;
}

export interface ProductMix {
  productId: string;
  productName: string;
  frequency: number;
  averageQuantity: number;
  peakHour: number;
  commonPairs: string[];
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageVisitFrequency: number;
  customerLifetimeValue: number;
  topCustomers: CustomerValue[];
  churnRisk: CustomerChurn[];
  loyaltyTierDistribution: LoyaltyTierStats[];
}

export interface CustomerValue {
  customerId: string;
  customerName: string;
  totalSpent: number;
  visitCount: number;
  averageOrderValue: number;
  lastVisit: Date;
  loyaltyPoints: number;
}

export interface CustomerChurn {
  customerId: string;
  customerName: string;
  lastVisit: Date;
  daysSinceLastVisit: number;
  previousVisitFrequency: number;
  riskScore: number;
}

export interface LoyaltyTierStats {
  tier: string;
  customerCount: number;
  totalRevenue: number;
  averageSpend: number;
}

export interface TimeAnalytics {
  hourlyDistribution: HourlyStat[];
  dailyDistribution: DailyStat[];
  weeklyTrend: WeeklyStat[];
  monthlyTrend: MonthlyStat[];
  peakHours: number[];
  slowHours: number[];
}

export interface HourlyStat {
  hour: number;
  revenue: number;
  transactions: number;
  averageOrderValue: number;
}

export interface DailyStat {
  dayOfWeek: number;
  dayName: string;
  revenue: number;
  transactions: number;
}

export interface WeeklyStat {
  week: number;
  year: number;
  startDate: Date;
  revenue: number;
  transactions: number;
  growth: number;
}

export interface MonthlyStat {
  month: number;
  year: number;
  revenue: number;
  transactions: number;
  growth: number;
}

export interface InventoryAnalytics {
  stockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  turnoverRate: number;
  daysOfStock: number;
  reorderSuggestions: ReorderSuggestion[];
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  dailyUsage: number;
  daysRemaining: number;
  suggestedOrder: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface EmployeeAnalytics {
  topPerformers: EmployeePerformance[];
  salesByEmployee: EmployeeSales[];
  shiftAnalysis: ShiftStats[];
}

export interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  transactionCount: number;
  averageOrderValue: number;
  itemsPerTransaction: number;
  hoursWorked: number;
  salesPerHour: number;
}

export interface EmployeeSales {
  employeeId: string;
  employeeName: string;
  revenue: number;
  percentOfTotal: number;
}

export interface ShiftStats {
  shiftId: string;
  employeeName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  sales: number;
  transactions: number;
  openingCash: number;
  closingCash: number;
  variance: number;
}

export interface PredictiveInsights {
  demandForecast: DemandForecast[];
  revenueProjection: RevenueProjection;
  seasonalPatterns: SeasonalPattern[];
  anomalyDetection: Anomaly[];
}

export interface DemandForecast {
  productId: string;
  productName: string;
  currentDemand: number;
  forecastedDemand: number;
  confidence: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface RevenueProjection {
  period: string;
  projected: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  factors: string[];
}

export interface SeasonalPattern {
  pattern: string;
  description: string;
  peakPeriods: string[];
  impact: number;
}

export interface Anomaly {
  type: 'positive' | 'negative';
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  timestamp: Date;
  possibleCauses: string[];
}

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export type WidgetType =
  | 'metric_card'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'table'
  | 'heatmap'
  | 'comparison'
  | 'trend'
  | 'gauge'
  | 'funnel';

@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private saleWhereClause(outletId: string, dateRange: DateRange) {
    return {
      outletId,
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    };
  }

  /**
   * Get sales metrics for period with growth comparison
   */
  async getSalesMetrics(outletId: string, dateRange: DateRange): Promise<SalesMetrics> {
    const cacheKey = `analytics:sales:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    const cached = await this.redis.get<SalesMetrics>(cacheKey);
    if (cached) return cached;

    const where = this.saleWhereClause(outletId, dateRange);

    const [aggregate, itemsAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where,
        _sum: { grandTotal: true, subtotal: true, discountAmount: true, taxAmount: true },
        _count: true,
      }),
      this.prisma.transactionItem.aggregate({
        where: { transaction: where },
        _sum: { quantity: true },
      }),
    ]);

    const totalRevenue = aggregate._sum.grandTotal?.toNumber() || 0;
    const totalTransactions = aggregate._count;
    const itemsSold = itemsAgg._sum.quantity?.toNumber() || 0;
    const discountGiven = aggregate._sum.discountAmount?.toNumber() || 0;
    const taxCollected = aggregate._sum.taxAmount?.toNumber() || 0;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate growth vs previous period
    const periodMs = dateRange.end.getTime() - dateRange.start.getTime();
    const prevStart = new Date(dateRange.start.getTime() - periodMs);
    const prevEnd = new Date(dateRange.start.getTime() - 1);
    const prevWhere = this.saleWhereClause(outletId, { start: prevStart, end: prevEnd });

    const prevAgg = await this.prisma.transaction.aggregate({
      where: prevWhere,
      _sum: { grandTotal: true },
      _count: true,
    });

    const prevRevenue = prevAgg._sum.grandTotal?.toNumber() || 0;
    const prevTransactions = prevAgg._count;

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const transactionGrowth =
      prevTransactions > 0 ? ((totalTransactions - prevTransactions) / prevTransactions) * 100 : 0;

    const result: SalesMetrics = {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      itemsSold,
      discountGiven,
      taxCollected,
      revenueGrowth,
      transactionGrowth,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get product analytics — top/low performers, category breakdown, product mix
   */
  async getProductAnalytics(
    outletId: string,
    dateRange: DateRange,
    limit = 10,
  ): Promise<ProductAnalytics> {
    const cacheKey = `analytics:products:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}:${limit}`;
    const cached = await this.redis.get<ProductAnalytics>(cacheKey);
    if (cached) return cached;

    const where = this.saleWhereClause(outletId, dateRange);

    // Fetch current period items
    const items = await this.prisma.transactionItem.findMany({
      where: { transaction: where },
      select: {
        transactionId: true,
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
        product: {
          select: {
            id: true,
            costPrice: true,
            category: { select: { id: true, name: true } },
          },
        },
        transaction: { select: { createdAt: true } },
      },
    });

    // Previous period for trend comparison
    const periodMs = dateRange.end.getTime() - dateRange.start.getTime();
    const prevStart = new Date(dateRange.start.getTime() - periodMs);
    const prevEnd = new Date(dateRange.start.getTime() - 1);
    const prevItems = await this.prisma.transactionItem.findMany({
      where: { transaction: this.saleWhereClause(outletId, { start: prevStart, end: prevEnd }) },
      select: { productId: true, productName: true, quantity: true, subtotal: true },
    });

    // Aggregate previous period by product
    const prevProductMap = new Map<string, { qty: number; revenue: number }>();
    for (const item of prevItems) {
      const key = item.productId ?? item.productName;
      const existing = prevProductMap.get(key);
      const qty = item.quantity.toNumber();
      const rev = item.subtotal?.toNumber() || 0;
      if (existing) {
        existing.qty += qty;
        existing.revenue += rev;
      } else {
        prevProductMap.set(key, { qty, revenue: rev });
      }
    }

    // Aggregate current period by product
    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
        cost: number;
        categoryId: string;
        categoryName: string;
        txIds: Set<string>;
        hours: number[];
      }
    >();

    let totalRevenue = 0;

    for (const item of items) {
      const key = item.productId ?? item.productName;
      const qty = item.quantity.toNumber();
      const rev = item.subtotal?.toNumber() || 0;
      const cost = (item.product?.costPrice?.toNumber() || 0) * qty;
      const catId = item.product?.category?.id ?? '';
      const catName = item.product?.category?.name ?? 'Tanpa Kategori';
      const hour = item.transaction.createdAt.getHours();
      totalRevenue += rev;

      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += rev;
        existing.cost += cost;
        existing.txIds.add(item.transactionId);
        existing.hours.push(hour);
      } else {
        productMap.set(key, {
          productId: item.productId ?? '',
          productName: item.productName,
          quantity: qty,
          revenue: rev,
          cost,
          categoryId: catId,
          categoryName: catName,
          txIds: new Set([item.transactionId]),
          hours: [hour],
        });
      }
    }

    // Build product performances with trend
    const allProducts = Array.from(productMap.values());
    const performances: ProductPerformance[] = allProducts.map((p) => {
      const prev = prevProductMap.get(p.productId || p.productName);
      const prevRev = prev?.revenue || 0;
      const trendValue = prevRev > 0 ? ((p.revenue - prevRev) / prevRev) * 100 : 0;
      const trend: 'up' | 'down' | 'stable' =
        trendValue > 5 ? 'up' : trendValue < -5 ? 'down' : 'stable';

      return {
        productId: p.productId,
        productName: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
        profit: p.revenue - p.cost,
        percentOfTotal: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
        trend,
        trendValue,
      };
    });

    const sortedByRevenue = [...performances].sort((a, b) => b.revenue - a.revenue);
    const topSellingProducts = sortedByRevenue.slice(0, limit);
    const lowPerformingProducts = sortedByRevenue.slice(-limit).reverse();

    // Category breakdown
    const catMap = new Map<
      string,
      { id: string; name: string; revenue: number; quantity: number; products: Set<string> }
    >();
    for (const p of allProducts) {
      const existing = catMap.get(p.categoryId);
      if (existing) {
        existing.revenue += p.revenue;
        existing.quantity += p.quantity;
        existing.products.add(p.productId);
      } else {
        catMap.set(p.categoryId, {
          id: p.categoryId,
          name: p.categoryName,
          revenue: p.revenue,
          quantity: p.quantity,
          products: new Set([p.productId]),
        });
      }
    }

    const categoryBreakdown: CategorySales[] = Array.from(catMap.values())
      .map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        revenue: c.revenue,
        quantity: c.quantity,
        percentOfTotal: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0,
        productCount: c.products.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Product mix — frequency, peak hour, common pairs
    const txProductMap = new Map<string, string[]>();
    for (const item of items) {
      const txId = item.transactionId;
      const key = item.productId ?? item.productName;
      const list = txProductMap.get(txId) ?? [];
      if (!list.includes(key)) list.push(key);
      txProductMap.set(txId, list);
    }

    const productMixAnalysis: ProductMix[] = allProducts.slice(0, limit).map((p) => {
      const key = p.productId || p.productName;
      const frequency = p.txIds.size;
      const averageQuantity = frequency > 0 ? p.quantity / frequency : 0;

      // Peak hour
      const hourCounts = new Map<number, number>();
      for (const h of p.hours) {
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }
      let peakHour = 0;
      let maxCount = 0;
      for (const [h, c] of hourCounts) {
        if (c > maxCount) {
          peakHour = h;
          maxCount = c;
        }
      }

      // Common pairs
      const pairCounts = new Map<string, number>();
      for (const [, products] of txProductMap) {
        if (products.includes(key)) {
          for (const other of products) {
            if (other !== key) {
              pairCounts.set(other, (pairCounts.get(other) || 0) + 1);
            }
          }
        }
      }
      const commonPairs = Array.from(pairCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => {
          const found = allProducts.find((x) => (x.productId || x.productName) === id);
          return found?.productName ?? id;
        });

      return {
        productId: p.productId,
        productName: p.productName,
        frequency,
        averageQuantity,
        peakHour,
        commonPairs,
      };
    });

    const result: ProductAnalytics = {
      topSellingProducts,
      lowPerformingProducts,
      categoryBreakdown,
      productMixAnalysis,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get time-based analytics — hourly, daily, weekly, monthly distribution
   */
  async getTimeAnalytics(outletId: string, dateRange: DateRange): Promise<TimeAnalytics> {
    const cacheKey = `analytics:time:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    const cached = await this.redis.get<TimeAnalytics>(cacheKey);
    if (cached) return cached;

    const where = this.saleWhereClause(outletId, dateRange);

    const txns = await this.prisma.transaction.findMany({
      where,
      select: { createdAt: true, grandTotal: true },
    });

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Hourly
    const hourlyMap = new Map<number, { revenue: number; count: number }>();
    for (let h = 0; h < 24; h++) hourlyMap.set(h, { revenue: 0, count: 0 });

    // Daily
    const dailyMap = new Map<number, { revenue: number; count: number }>();
    for (let d = 0; d < 7; d++) dailyMap.set(d, { revenue: 0, count: 0 });

    // Weekly
    const weeklyMap = new Map<
      string,
      { week: number; year: number; startDate: Date; revenue: number; count: number }
    >();

    // Monthly
    const monthlyMap = new Map<
      string,
      { month: number; year: number; revenue: number; count: number }
    >();

    for (const tx of txns) {
      const amount = tx.grandTotal?.toNumber() || 0;
      const date = tx.createdAt;
      const hour = date.getHours();
      const day = date.getDay();
      const month = date.getMonth();
      const year = date.getFullYear();

      // Hourly
      const hEntry = hourlyMap.get(hour)!;
      hEntry.revenue += amount;
      hEntry.count += 1;

      // Daily
      const dEntry = dailyMap.get(day)!;
      dEntry.revenue += amount;
      dEntry.count += 1;

      // Weekly (ISO week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = `${year}-W${getISOWeek(date)}`;
      const wEntry = weeklyMap.get(weekKey);
      if (wEntry) {
        wEntry.revenue += amount;
        wEntry.count += 1;
      } else {
        weeklyMap.set(weekKey, {
          week: getISOWeek(date),
          year,
          startDate: weekStart,
          revenue: amount,
          count: 1,
        });
      }

      // Monthly
      const mKey = `${year}-${month}`;
      const mEntry = monthlyMap.get(mKey);
      if (mEntry) {
        mEntry.revenue += amount;
        mEntry.count += 1;
      } else {
        monthlyMap.set(mKey, { month: month + 1, year, revenue: amount, count: 1 });
      }
    }

    const hourlyDistribution: HourlyStat[] = Array.from(hourlyMap.entries()).map(
      ([hour, data]) => ({
        hour,
        revenue: data.revenue,
        transactions: data.count,
        averageOrderValue: data.count > 0 ? data.revenue / data.count : 0,
      }),
    );

    const dailyDistribution: DailyStat[] = Array.from(dailyMap.entries()).map(([day, data]) => ({
      dayOfWeek: day,
      dayName: dayNames[day],
      revenue: data.revenue,
      transactions: data.count,
    }));

    // Weekly with growth
    const weeklyArr = Array.from(weeklyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    });
    const weeklyTrend: WeeklyStat[] = weeklyArr.map((w, i) => {
      const prevRevenue = i > 0 ? weeklyArr[i - 1].revenue : 0;
      const growth = prevRevenue > 0 ? ((w.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      return { ...w, transactions: w.count, growth };
    });

    // Monthly with growth
    const monthlyArr = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    const monthlyTrend: MonthlyStat[] = monthlyArr.map((m, i) => {
      const prevRevenue = i > 0 ? monthlyArr[i - 1].revenue : 0;
      const growth = prevRevenue > 0 ? ((m.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      return { ...m, transactions: m.count, growth };
    });

    // Peak/slow hours
    const sortedByTx = [...hourlyDistribution].sort((a, b) => b.transactions - a.transactions);
    const peakHours = sortedByTx
      .filter((h) => h.transactions > 0)
      .slice(0, 3)
      .map((h) => h.hour);
    const slowHours = sortedByTx
      .filter((h) => h.transactions > 0)
      .slice(-3)
      .map((h) => h.hour);

    const result: TimeAnalytics = {
      hourlyDistribution,
      dailyDistribution,
      weeklyTrend,
      monthlyTrend,
      peakHours: peakHours.length > 0 ? peakHours : [12, 13, 19],
      slowHours: slowHours.length > 0 ? slowHours : [6, 7, 15],
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get customer analytics — segmentation, CLV, churn risk
   */
  async getCustomerAnalytics(outletId: string, dateRange: DateRange): Promise<CustomerAnalytics> {
    const cacheKey = `analytics:customers:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    const cached = await this.redis.get<CustomerAnalytics>(cacheKey);
    if (cached) return cached;

    // Get businessId from outlet
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    const businessId = outlet?.businessId ?? '';

    const now = new Date();

    const [totalCustomers, newCustomers, customerAgg, topCustomersData, tierGroups] =
      await Promise.all([
        this.prisma.customer.count({
          where: { businessId, isActive: true },
        }),
        this.prisma.customer.count({
          where: {
            businessId,
            isActive: true,
            createdAt: { gte: dateRange.start, lte: dateRange.end },
          },
        }),
        this.prisma.customer.aggregate({
          where: { businessId, isActive: true, visitCount: { gt: 0 } },
          _avg: { visitCount: true, totalSpent: true },
        }),
        this.prisma.customer.findMany({
          where: { businessId, isActive: true },
          orderBy: { totalSpent: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            totalSpent: true,
            visitCount: true,
            lastVisitAt: true,
            loyaltyPoints: true,
          },
        }),
        this.prisma.customer.groupBy({
          by: ['loyaltyTier'],
          where: { businessId, isActive: true },
          _count: { id: true },
          _sum: { totalSpent: true },
          _avg: { totalSpent: true },
        }),
      ]);

    // Returning customers: visitCount > 1 who transacted in dateRange
    const returningCustomers = await this.prisma.customer.count({
      where: {
        businessId,
        isActive: true,
        visitCount: { gt: 1 },
        lastVisitAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });

    const averageVisitFrequency = customerAgg._avg.visitCount || 0;
    const customerLifetimeValue = customerAgg._avg.totalSpent?.toNumber() || 0;

    const topCustomers: CustomerValue[] = topCustomersData.map((c) => ({
      customerId: c.id,
      customerName: c.name,
      totalSpent: c.totalSpent.toNumber(),
      visitCount: c.visitCount,
      averageOrderValue: c.visitCount > 0 ? c.totalSpent.toNumber() / c.visitCount : 0,
      lastVisit: c.lastVisitAt ?? new Date(0),
      loyaltyPoints: c.loyaltyPoints,
    }));

    // Churn risk: customers who haven't visited in 30+ days but used to visit regularly
    const churnCandidates = await this.prisma.customer.findMany({
      where: {
        businessId,
        isActive: true,
        visitCount: { gt: 2 },
        lastVisitAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      take: 10,
      orderBy: { totalSpent: 'desc' },
      select: {
        id: true,
        name: true,
        lastVisitAt: true,
        visitCount: true,
        createdAt: true,
      },
    });

    const churnRisk: CustomerChurn[] = churnCandidates.map((c) => {
      const daysSinceLastVisit = c.lastVisitAt
        ? Math.floor((now.getTime() - c.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const accountAge = Math.max(
        1,
        Math.floor((now.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const previousVisitFrequency = c.visitCount / (accountAge / 30);
      const riskScore = Math.min(100, Math.round((daysSinceLastVisit / 90) * 100));

      return {
        customerId: c.id,
        customerName: c.name,
        lastVisit: c.lastVisitAt ?? c.createdAt,
        daysSinceLastVisit,
        previousVisitFrequency,
        riskScore,
      };
    });

    const loyaltyTierDistribution: LoyaltyTierStats[] = tierGroups.map((g) => ({
      tier: g.loyaltyTier || 'none',
      customerCount: g._count.id,
      totalRevenue: g._sum.totalSpent?.toNumber() || 0,
      averageSpend: g._avg.totalSpent?.toNumber() || 0,
    }));

    const result: CustomerAnalytics = {
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageVisitFrequency,
      customerLifetimeValue,
      topCustomers,
      churnRisk,
      loyaltyTierDistribution,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get inventory analytics — stock value, low/out/overstock, turnover, reorder suggestions
   */
  async getInventoryAnalytics(outletId: string): Promise<InventoryAnalytics> {
    const cacheKey = `analytics:inventory:${outletId}`;
    const cached = await this.redis.get<InventoryAnalytics>(cacheKey);
    if (cached) return cached;

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId },
      include: {
        product: { select: { id: true, name: true, costPrice: true, basePrice: true } },
      },
    });

    // Calculate items sold in last 30 days for turnover
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          outletId,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      select: { productId: true, quantity: true },
    });

    // Daily usage by product
    const usageMap = new Map<string, number>();
    for (const sale of recentSales) {
      if (sale.productId) {
        usageMap.set(
          sale.productId,
          (usageMap.get(sale.productId) || 0) + sale.quantity.toNumber(),
        );
      }
    }

    let stockValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let overStockItems = 0;
    let totalStock = 0;
    let totalSold30d = 0;
    const reorderSuggestions: ReorderSuggestion[] = [];

    for (const sl of stockLevels) {
      const qty = sl.quantity.toNumber();
      const costPrice = sl.product?.costPrice?.toNumber() || 0;
      stockValue += qty * costPrice;
      totalStock += qty;

      const sold30d = usageMap.get(sl.productId ?? '') || 0;
      totalSold30d += sold30d;
      const dailyUsage = sold30d / 30;

      if (qty <= 0) {
        outOfStockItems++;
      } else if (qty <= sl.lowStockAlert) {
        lowStockItems++;
      } else if (sl.lowStockAlert > 0 && qty > sl.lowStockAlert * 5) {
        overStockItems++;
      }

      // Reorder suggestions
      if (dailyUsage > 0 && sl.productId) {
        const daysRemaining = qty / dailyUsage;
        if (daysRemaining < 14) {
          const suggestedOrder = Math.ceil(dailyUsage * 30 - qty);
          let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
          if (daysRemaining <= 0) urgency = 'critical';
          else if (daysRemaining <= 3) urgency = 'high';
          else if (daysRemaining <= 7) urgency = 'medium';

          reorderSuggestions.push({
            productId: sl.productId,
            productName: sl.product?.name ?? '',
            currentStock: qty,
            dailyUsage,
            daysRemaining: Math.max(0, daysRemaining),
            suggestedOrder: Math.max(0, suggestedOrder),
            urgency,
          });
        }
      }
    }

    reorderSuggestions.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const avgStock = stockLevels.length > 0 ? totalStock / stockLevels.length : 0;
    const turnoverRate = avgStock > 0 ? totalSold30d / 30 / avgStock : 0;
    const dailyUsageTotal = totalSold30d / 30;
    const daysOfStock = dailyUsageTotal > 0 ? totalStock / dailyUsageTotal : 999;

    const result: InventoryAnalytics = {
      stockValue,
      lowStockItems,
      outOfStockItems,
      overStockItems,
      turnoverRate,
      daysOfStock: Math.min(daysOfStock, 999),
      reorderSuggestions: reorderSuggestions.slice(0, 20),
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get employee analytics — top performers, sales breakdown, shift analysis
   */
  async getEmployeeAnalytics(outletId: string, dateRange: DateRange): Promise<EmployeeAnalytics> {
    const cacheKey = `analytics:employees:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    const cached = await this.redis.get<EmployeeAnalytics>(cacheKey);
    if (cached) return cached;

    const where = this.saleWhereClause(outletId, dateRange);

    // Sales by employee
    const employeeSales = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where,
      _sum: { grandTotal: true },
      _count: true,
      _avg: { grandTotal: true },
    });

    // Get employee names
    const employeeIds = employeeSales
      .map((e) => e.employeeId)
      .filter((id): id is string => id !== null);

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(employees.map((e) => [e.id, e.name]));

    // Items per transaction per employee
    const txItemCounts = await this.prisma.transactionItem.groupBy({
      by: ['transactionId'],
      where: { transaction: where },
      _count: true,
    });
    const txEmployeeMap = new Map<string, string>();
    const txList = await this.prisma.transaction.findMany({
      where,
      select: { id: true, employeeId: true },
    });
    for (const tx of txList) {
      if (tx.employeeId) txEmployeeMap.set(tx.id, tx.employeeId);
    }

    const employeeItemsMap = new Map<string, { totalItems: number; txCount: number }>();
    for (const tic of txItemCounts) {
      const empId = txEmployeeMap.get(tic.transactionId);
      if (empId) {
        const existing = employeeItemsMap.get(empId);
        if (existing) {
          existing.totalItems += tic._count;
          existing.txCount += 1;
        } else {
          employeeItemsMap.set(empId, { totalItems: tic._count, txCount: 1 });
        }
      }
    }

    // Shifts for hours worked
    const shifts = await this.prisma.shift.findMany({
      where: {
        outletId,
        startedAt: { gte: dateRange.start, lte: dateRange.end },
        status: 'closed',
      },
      select: {
        id: true,
        employeeId: true,
        startedAt: true,
        endedAt: true,
        openingCash: true,
        closingCash: true,
        expectedCash: true,
        cashDifference: true,
      },
    });

    const employeeHoursMap = new Map<string, number>();
    for (const shift of shifts) {
      if (shift.endedAt) {
        const hours = (shift.endedAt.getTime() - shift.startedAt.getTime()) / (1000 * 60 * 60);
        employeeHoursMap.set(
          shift.employeeId,
          (employeeHoursMap.get(shift.employeeId) || 0) + hours,
        );
      }
    }

    const totalRevenue = employeeSales.reduce(
      (s, e) => s + (e._sum.grandTotal?.toNumber() || 0),
      0,
    );

    const salesByEmployeeResult: EmployeeSales[] = employeeSales
      .filter((e) => e.employeeId)
      .map((e) => ({
        employeeId: e.employeeId!,
        employeeName: nameMap.get(e.employeeId!) ?? 'Unknown',
        revenue: e._sum.grandTotal?.toNumber() || 0,
        percentOfTotal:
          totalRevenue > 0 ? ((e._sum.grandTotal?.toNumber() || 0) / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topPerformers: EmployeePerformance[] = employeeSales
      .filter((e) => e.employeeId)
      .map((e) => {
        const empId = e.employeeId!;
        const totalSales = e._sum.grandTotal?.toNumber() || 0;
        const txCount = e._count;
        const hoursWorked = employeeHoursMap.get(empId) || 0;
        const itemsData = employeeItemsMap.get(empId);
        const itemsPerTransaction =
          itemsData && itemsData.txCount > 0 ? itemsData.totalItems / itemsData.txCount : 0;

        return {
          employeeId: empId,
          employeeName: nameMap.get(empId) ?? 'Unknown',
          totalSales,
          transactionCount: txCount,
          averageOrderValue: txCount > 0 ? totalSales / txCount : 0,
          itemsPerTransaction,
          hoursWorked,
          salesPerHour: hoursWorked > 0 ? totalSales / hoursWorked : 0,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    // Shift analysis
    const shiftAnalysis: ShiftStats[] = shifts
      .filter((s) => s.endedAt)
      .map((s) => {
        const duration = (s.endedAt!.getTime() - s.startedAt.getTime()) / (1000 * 60 * 60);
        const empName = nameMap.get(s.employeeId) ?? 'Unknown';

        return {
          shiftId: s.id,
          employeeName: empName,
          startTime: s.startedAt,
          endTime: s.endedAt!,
          duration,
          sales: 0,
          transactions: 0,
          openingCash: s.openingCash?.toNumber() || 0,
          closingCash: s.closingCash?.toNumber() || 0,
          variance: s.cashDifference?.toNumber() || 0,
        };
      })
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 20);

    const result: EmployeeAnalytics = {
      topPerformers,
      salesByEmployee: salesByEmployeeResult,
      shiftAnalysis,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * Get predictive insights using simple statistical analysis
   */
  async getPredictiveInsights(outletId: string, dateRange: DateRange): Promise<PredictiveInsights> {
    const cacheKey = `analytics:predictions:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    const cached = await this.redis.get<PredictiveInsights>(cacheKey);
    if (cached) return cached;

    const where = this.saleWhereClause(outletId, dateRange);

    // Demand forecast: compare current vs previous period per product
    const periodMs = dateRange.end.getTime() - dateRange.start.getTime();
    const prevStart = new Date(dateRange.start.getTime() - periodMs);
    const prevEnd = new Date(dateRange.start.getTime() - 1);

    const [currentItems, prevItems] = await Promise.all([
      this.prisma.transactionItem.findMany({
        where: { transaction: where },
        select: { productId: true, productName: true, quantity: true },
      }),
      this.prisma.transactionItem.findMany({
        where: { transaction: this.saleWhereClause(outletId, { start: prevStart, end: prevEnd }) },
        select: { productId: true, productName: true, quantity: true },
      }),
    ]);

    // Aggregate by product
    const currentDemandMap = new Map<string, { name: string; qty: number }>();
    for (const item of currentItems) {
      const key = item.productId ?? item.productName;
      const existing = currentDemandMap.get(key);
      if (existing) {
        existing.qty += item.quantity.toNumber();
      } else {
        currentDemandMap.set(key, { name: item.productName, qty: item.quantity.toNumber() });
      }
    }

    const prevDemandMap = new Map<string, number>();
    for (const item of prevItems) {
      const key = item.productId ?? item.productName;
      prevDemandMap.set(key, (prevDemandMap.get(key) || 0) + item.quantity.toNumber());
    }

    const demandForecast: DemandForecast[] = Array.from(currentDemandMap.entries())
      .map(([id, data]) => {
        const prevQty = prevDemandMap.get(id) || 0;
        const growth = prevQty > 0 ? (data.qty - prevQty) / prevQty : 0;
        const forecastedDemand = Math.round(data.qty * (1 + growth));
        const trend: 'rising' | 'falling' | 'stable' =
          growth > 0.1 ? 'rising' : growth < -0.1 ? 'falling' : 'stable';

        return {
          productId: id,
          productName: data.name,
          currentDemand: data.qty,
          forecastedDemand: Math.max(0, forecastedDemand),
          confidence: prevQty > 0 ? 0.7 : 0.4,
          trend,
        };
      })
      .sort((a, b) => b.currentDemand - a.currentDemand)
      .slice(0, 15);

    // Revenue projection: simple linear regression on daily revenue
    const txns = await this.prisma.transaction.findMany({
      where,
      select: { createdAt: true, grandTotal: true },
    });

    const dailyRevenue = new Map<string, number>();
    for (const tx of txns) {
      const dateKey = tx.createdAt.toISOString().substring(0, 10);
      dailyRevenue.set(
        dateKey,
        (dailyRevenue.get(dateKey) || 0) + (tx.grandTotal?.toNumber() || 0),
      );
    }

    const dailyValues = Array.from(dailyRevenue.values());
    const avgDaily =
      dailyValues.length > 0 ? dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length : 0;
    const stdDev =
      dailyValues.length > 1
        ? Math.sqrt(dailyValues.reduce((s, v) => s + (v - avgDaily) ** 2, 0) / dailyValues.length)
        : 0;

    const daysInPeriod = Math.max(1, periodMs / (1000 * 60 * 60 * 24));
    const projectedRevenue = avgDaily * daysInPeriod;

    const revenueProjection: RevenueProjection = {
      period: 'next_period',
      projected: Math.round(projectedRevenue),
      lowerBound: Math.round(Math.max(0, projectedRevenue - stdDev * daysInPeriod * 0.5)),
      upperBound: Math.round(projectedRevenue + stdDev * daysInPeriod * 0.5),
      confidence: dailyValues.length >= 7 ? 0.75 : 0.5,
      factors: ['Tren historis', 'Pola musiman', 'Tingkat pertumbuhan'],
    };

    // Seasonal patterns: day-of-week variance
    const dayRevenue = new Map<number, number[]>();
    for (const tx of txns) {
      const day = tx.createdAt.getDay();
      const list = dayRevenue.get(day) ?? [];
      list.push(tx.grandTotal?.toNumber() || 0);
      dayRevenue.set(day, list);
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayAvgs = new Map<number, number>();
    let overallAvgPerTx = 0;
    let totalTxForAvg = 0;
    for (const [day, values] of dayRevenue) {
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      dayAvgs.set(day, avg);
      overallAvgPerTx += values.reduce((s, v) => s + v, 0);
      totalTxForAvg += values.length;
    }
    overallAvgPerTx = totalTxForAvg > 0 ? overallAvgPerTx / totalTxForAvg : 0;

    const peakDays = Array.from(dayAvgs.entries())
      .filter(([, avg]) => overallAvgPerTx > 0 && avg > overallAvgPerTx * 1.1)
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => dayNames[day]);

    const seasonalPatterns: SeasonalPattern[] = [];
    if (peakDays.length > 0) {
      const peakImpact =
        overallAvgPerTx > 0 ? Math.max(...Array.from(dayAvgs.values())) / overallAvgPerTx : 1;
      seasonalPatterns.push({
        pattern: 'weekly',
        description: `Penjualan lebih tinggi di hari ${peakDays.join(', ')}`,
        peakPeriods: peakDays,
        impact: Math.round(peakImpact * 100) / 100,
      });
    }

    // Anomaly detection: find days > 2 stddev from mean
    const anomalyDetection: Anomaly[] = [];
    if (stdDev > 0) {
      for (const [dateKey, revenue] of dailyRevenue) {
        const deviation = (revenue - avgDaily) / stdDev;
        if (Math.abs(deviation) >= 2) {
          anomalyDetection.push({
            type: deviation > 0 ? 'positive' : 'negative',
            metric: 'daily_revenue',
            expectedValue: Math.round(avgDaily),
            actualValue: Math.round(revenue),
            deviation: Math.round(deviation * 100) / 100,
            timestamp: new Date(dateKey),
            possibleCauses:
              deviation > 0
                ? ['Promosi aktif', 'Event/hari libur', 'Traffic tinggi']
                : ['Hari libur/tutup', 'Masalah operasional', 'Cuaca buruk'],
          });
        }
      }
    }

    anomalyDetection.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

    const result: PredictiveInsights = {
      demandForecast,
      revenueProjection,
      seasonalPatterns,
      anomalyDetection: anomalyDetection.slice(0, 10),
    };

    await this.redis.set(cacheKey, result, 600); // 10 min cache for predictions
    return result;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(
    outletId: string,
    dateRange: DateRange,
  ): Promise<{
    sales: SalesMetrics;
    products: ProductAnalytics;
    time: TimeAnalytics;
    customers: CustomerAnalytics;
    inventory: InventoryAnalytics;
    employees: EmployeeAnalytics;
    predictions: PredictiveInsights;
  }> {
    const [sales, products, time, customers, inventory, employees, predictions] = await Promise.all(
      [
        this.getSalesMetrics(outletId, dateRange),
        this.getProductAnalytics(outletId, dateRange),
        this.getTimeAnalytics(outletId, dateRange),
        this.getCustomerAnalytics(outletId, dateRange),
        this.getInventoryAnalytics(outletId),
        this.getEmployeeAnalytics(outletId, dateRange),
        this.getPredictiveInsights(outletId, dateRange),
      ],
    );

    return {
      sales,
      products,
      time,
      customers,
      inventory,
      employees,
      predictions,
    };
  }
}

/** Get ISO week number */
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  );
}
