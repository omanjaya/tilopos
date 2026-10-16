/**
 * Advanced Analytics & Business Intelligence Service
 *
 * Provides real-time metrics, trend analysis, and predictive insights
 * using actual database queries with Redis caching.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';
import { AnalyticsQueriesService, type SalesScope } from './analytics-queries.service';
import {
  addBusinessDays,
  parseBusinessDate,
  startOfBusinessDay,
} from '@shared/utils/business-time';

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
  /** null when the caller may not see cost data (supervisor). */
  profit: number | null;
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
  /** Cash fields are null when the caller may not see cash data (supervisor). */
  openingCash: number | null;
  closingCash: number | null;
  variance: number | null;
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

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** Distinct products considered per analytics request (R13). */
const MAX_ANALYTICS_PRODUCTS = 5000;

/**
 * Analytics for one outlet. The caller (AnalyticsController) has already
 * verified the outlet belongs to the user's business (R3). All bucketing is in
 * Asia/Jakarta (R14) and aggregation runs in SQL via AnalyticsQueriesService (R13).
 */
@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 60; // short: no invalidation on sale/void/refund

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  private saleWhereClause(outletId: string, dateRange: DateRange) {
    return {
      outletId,
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    };
  }

  private scope(outletId: string, dateRange: DateRange): SalesScope {
    return { outletIds: [outletId], start: dateRange.start, end: dateRange.end };
  }

  private previousRange(dateRange: DateRange): DateRange {
    const periodMs = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - periodMs),
      end: new Date(dateRange.start.getTime() - 1),
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

    const prevAgg = await this.prisma.transaction.aggregate({
      where: this.saleWhereClause(outletId, this.previousRange(dateRange)),
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
   * Get product analytics — top/low performers, category breakdown, product mix.
   * `includeCost` = false hides the cost-derived profit (supervisor, R12).
   */
  async getProductAnalytics(
    outletId: string,
    dateRange: DateRange,
    limit = 10,
    includeCost = true,
  ): Promise<ProductAnalytics> {
    const cacheKey = `analytics:products:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}:${limit}:${includeCost ? 'c' : 'n'}`;
    const cached = await this.redis.get<ProductAnalytics>(cacheKey);
    if (cached) return cached;

    const scope = this.scope(outletId, dateRange);
    const [rows, prevRows] = await Promise.all([
      this.queries.itemSales(scope, { limit: MAX_ANALYTICS_PRODUCTS }),
      this.queries.itemSales(this.scope(outletId, this.previousRange(dateRange)), {
        limit: MAX_ANALYTICS_PRODUCTS,
      }),
    ]);

    const keyOf = (r: { productId: string | null; productName: string }) =>
      r.productId ?? r.productName;
    const prevProductMap = new Map(prevRows.map((r) => [keyOf(r), r.revenue]));
    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);

    const performances: ProductPerformance[] = rows.map((p) => {
      const prevRev = prevProductMap.get(keyOf(p)) || 0;
      const trendValue = prevRev > 0 ? ((p.revenue - prevRev) / prevRev) * 100 : 0;
      const trend: 'up' | 'down' | 'stable' =
        trendValue > 5 ? 'up' : trendValue < -5 ? 'down' : 'stable';

      return {
        productId: p.productId ?? '',
        productName: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
        profit: includeCost ? p.revenue - p.cost : null,
        percentOfTotal: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
        trend,
        trendValue,
      };
    });

    // rows are already sorted by revenue desc
    const topSellingProducts = performances.slice(0, limit);
    const lowPerformingProducts = performances.slice(-limit).reverse();

    // Category breakdown
    const catMap = new Map<
      string,
      { id: string; name: string; revenue: number; quantity: number; products: Set<string> }
    >();
    for (const p of rows) {
      const catId = p.categoryId ?? '';
      const existing = catMap.get(catId);
      if (existing) {
        existing.revenue += p.revenue;
        existing.quantity += p.quantity;
        existing.products.add(keyOf(p));
      } else {
        catMap.set(catId, {
          id: catId,
          name: p.categoryName ?? 'Tanpa Kategori',
          revenue: p.revenue,
          quantity: p.quantity,
          products: new Set([keyOf(p)]),
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

    // Product mix for the top products: peak WIB hour and co-purchases in one query each
    const mixRows = rows.slice(0, limit);
    const mixKeys = mixRows.map(keyOf);
    const [peakHours, pairs] = await Promise.all([
      this.queries.peakHourByProduct(scope, mixKeys),
      this.queries.commonPairs(scope, mixKeys, 3),
    ]);

    const productMixAnalysis: ProductMix[] = mixRows.map((p) => {
      const frequency = p.transactionCount;
      return {
        productId: p.productId ?? '',
        productName: p.productName,
        frequency,
        averageQuantity: frequency > 0 ? p.quantity / frequency : 0,
        peakHour: peakHours.get(keyOf(p)) ?? 0,
        commonPairs: pairs.get(keyOf(p)) ?? [],
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
   * Get time-based analytics — hourly, daily, weekly, monthly distribution (WIB)
   */
  async getTimeAnalytics(outletId: string, dateRange: DateRange): Promise<TimeAnalytics> {
    const cacheKey = `analytics:time:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    const cached = await this.redis.get<TimeAnalytics>(cacheKey);
    if (cached) return cached;

    const scope = this.scope(outletId, dateRange);
    const [byHour, byWeekday, byWeek, byMonth] = await Promise.all([
      this.queries.salesByHour(scope),
      this.queries.salesByWeekday(scope),
      this.queries.salesByIsoWeek(scope),
      this.queries.salesByMonth(scope),
    ]);

    const hourMap = new Map(byHour.map((r) => [Number(r.bucket), r]));
    const hourlyDistribution: HourlyStat[] = Array.from({ length: 24 }, (_, hour) => {
      const r = hourMap.get(hour);
      const revenue = r?.amount ?? 0;
      const transactions = r?.count ?? 0;
      return {
        hour,
        revenue,
        transactions,
        averageOrderValue: transactions > 0 ? revenue / transactions : 0,
      };
    });

    const dayMap = new Map(byWeekday.map((r) => [Number(r.bucket), r]));
    const dailyDistribution: DailyStat[] = DAY_NAMES.map((dayName, day) => ({
      dayOfWeek: day,
      dayName,
      revenue: dayMap.get(day)?.amount ?? 0,
      transactions: dayMap.get(day)?.count ?? 0,
    }));

    // ISO week-year + week, Monday start, all in WIB (bucket "IYYY-IW|YYYY-MM-DD")
    const weeklyArr = byWeek.map((r) => {
      const [isoKey, monday] = r.bucket.split('|');
      const [year, week] = isoKey.split('-').map(Number);
      return {
        week,
        year,
        startDate: parseBusinessDate(monday).start,
        revenue: r.amount,
        count: r.count,
      };
    });
    const weeklyTrend: WeeklyStat[] = weeklyArr.map((w, i) => {
      const prevRevenue = i > 0 ? weeklyArr[i - 1].revenue : 0;
      const growth = prevRevenue > 0 ? ((w.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      return {
        week: w.week,
        year: w.year,
        startDate: w.startDate,
        revenue: w.revenue,
        transactions: w.count,
        growth,
      };
    });

    const monthlyArr = byMonth.map((r) => {
      const [year, month] = r.bucket.split('-').map(Number);
      return { year, month, revenue: r.amount, count: r.count };
    });
    const monthlyTrend: MonthlyStat[] = monthlyArr.map((m, i) => {
      const prevRevenue = i > 0 ? monthlyArr[i - 1].revenue : 0;
      const growth = prevRevenue > 0 ? ((m.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      return {
        month: m.month,
        year: m.year,
        revenue: m.revenue,
        transactions: m.count,
        growth,
      };
    });

    // Peak/slow hours from real data only — empty when there are no sales (R10)
    const active = hourlyDistribution
      .filter((h) => h.transactions > 0)
      .sort((a, b) => b.transactions - a.transactions);
    const peakHours = active.slice(0, 3).map((h) => h.hour);
    const slowHours = active.slice(-3).map((h) => h.hour);

    const result: TimeAnalytics = {
      hourlyDistribution,
      dailyDistribution,
      weeklyTrend,
      monthlyTrend,
      peakHours,
      slowHours,
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

    // Get businessId from outlet (already verified by the controller)
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet) {
      return {
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        averageVisitFrequency: 0,
        customerLifetimeValue: 0,
        topCustomers: [],
        churnRisk: [],
        loyaltyTierDistribution: [],
      };
    }
    const businessId = outlet.businessId;

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
      select: {
        productId: true,
        variantId: true,
        quantity: true,
        lowStockAlert: true,
        product: { select: { name: true, costPrice: true } },
        variant: { select: { name: true, costPrice: true } },
      },
    });

    // Units sold in the last 30 business days (WIB), per product+variant, in SQL
    const thirtyDaysAgo = startOfBusinessDay(addBusinessDays(new Date(), -30));
    const recentSales = await this.prisma.transactionItem.groupBy({
      by: ['productId', 'variantId'],
      where: {
        transaction: {
          outletId,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      _sum: { quantity: true },
    });

    const usageKey = (productId: string | null, variantId: string | null) =>
      `${productId ?? ''}:${variantId ?? ''}`;
    const usageMap = new Map<string, number>();
    const productUsage = new Map<string, number>();
    for (const sale of recentSales) {
      const qty = sale._sum.quantity?.toNumber() || 0;
      usageMap.set(usageKey(sale.productId, sale.variantId), qty);
      if (sale.productId) {
        productUsage.set(sale.productId, (productUsage.get(sale.productId) || 0) + qty);
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
      // Variant stock is valued at the variant cost, falling back to the product cost
      const costPrice = sl.variant?.costPrice?.toNumber() ?? sl.product?.costPrice?.toNumber() ?? 0;
      stockValue += qty * costPrice;
      totalStock += qty;

      // Variant stock uses its own usage; product-level stock uses all its sales
      const sold30d = sl.variantId
        ? usageMap.get(usageKey(sl.productId, sl.variantId)) || 0
        : productUsage.get(sl.productId ?? '') || 0;
      totalSold30d += sold30d;
      const dailyUsage = sold30d / 30;

      if (qty <= 0) {
        outOfStockItems++;
      } else if (qty <= sl.lowStockAlert) {
        lowStockItems++;
      } else if (sl.lowStockAlert > 0 && qty > sl.lowStockAlert * 5) {
        overStockItems++;
      }

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
            productName: [sl.product?.name, sl.variant?.name].filter(Boolean).join(' - '),
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
   * Get employee analytics — top performers, sales breakdown, shift analysis.
   * `includeCash` = false hides shift cash/variance (supervisor, R12).
   */
  async getEmployeeAnalytics(
    outletId: string,
    dateRange: DateRange,
    includeCash = true,
  ): Promise<EmployeeAnalytics> {
    const cacheKey = `analytics:employees:${outletId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}:${includeCash ? 'c' : 'n'}`;
    const cached = await this.redis.get<EmployeeAnalytics>(cacheKey);
    if (cached) return cached;

    const where = this.saleWhereClause(outletId, dateRange);

    const [employeeSales, itemsByEmployee, shifts] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['employeeId'],
        where,
        _sum: { grandTotal: true },
        _count: true,
        _avg: { grandTotal: true },
      }),
      // Item lines per transaction per employee in one SQL aggregate (F1380)
      this.queries.itemsPerEmployee(this.scope(outletId, dateRange)),
      this.prisma.shift.findMany({
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
        orderBy: { startedAt: 'desc' },
        take: 500,
      }),
    ]);

    const employeeIds = [
      ...new Set([
        ...employeeSales.map((e) => e.employeeId).filter((id): id is string => id !== null),
        ...shifts.map((s) => s.employeeId),
      ]),
    ];

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(employees.map((e) => [e.id, e.name]));

    // Real per-shift sales (F1381)
    const shiftIds = shifts.map((s) => s.id);
    const shiftSales =
      shiftIds.length > 0
        ? await this.prisma.transaction.groupBy({
            by: ['shiftId'],
            where: {
              outletId,
              shiftId: { in: shiftIds },
              transactionType: 'sale',
              status: 'completed',
            },
            _sum: { grandTotal: true },
            _count: true,
          })
        : [];
    const shiftSalesMap = new Map(shiftSales.map((s) => [s.shiftId, s]));

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
        const itemsData = itemsByEmployee.get(empId);
        const itemsPerTransaction =
          itemsData && itemsData.transactions > 0 ? itemsData.lines / itemsData.transactions : 0;

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

    const shiftAnalysis: ShiftStats[] = shifts
      .filter((s) => s.endedAt)
      .slice(0, 20)
      .map((s) => {
        const duration = (s.endedAt!.getTime() - s.startedAt.getTime()) / (1000 * 60 * 60);
        const sales = shiftSalesMap.get(s.id);
        return {
          shiftId: s.id,
          employeeName: nameMap.get(s.employeeId) ?? 'Unknown',
          startTime: s.startedAt,
          endTime: s.endedAt!,
          duration,
          sales: sales?._sum.grandTotal?.toNumber() || 0,
          transactions: sales?._count ?? 0,
          openingCash: includeCash ? s.openingCash?.toNumber() || 0 : null,
          closingCash: includeCash ? s.closingCash?.toNumber() || 0 : null,
          variance: includeCash ? s.cashDifference?.toNumber() || 0 : null,
        };
      });

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

    const scope = this.scope(outletId, dateRange);
    const periodMs = dateRange.end.getTime() - dateRange.start.getTime();

    // Demand per product for current vs previous period (SQL aggregates, F1382)
    const [currentRows, prevRows, daily, byWeekday] = await Promise.all([
      this.queries.itemSales(scope, { limit: MAX_ANALYTICS_PRODUCTS }),
      this.queries.itemSales(this.scope(outletId, this.previousRange(dateRange)), {
        limit: MAX_ANALYTICS_PRODUCTS,
      }),
      this.queries.salesByDay(scope),
      this.queries.salesByWeekday(scope),
    ]);

    const keyOf = (r: { productId: string | null; productName: string }) =>
      r.productId ?? r.productName;
    const prevDemandMap = new Map(prevRows.map((r) => [keyOf(r), r.quantity]));

    const demandForecast: DemandForecast[] = currentRows
      .map((row) => {
        const prevQty = prevDemandMap.get(keyOf(row)) || 0;
        const growth = prevQty > 0 ? (row.quantity - prevQty) / prevQty : 0;
        const forecastedDemand = Math.round(row.quantity * (1 + growth));
        const trend: 'rising' | 'falling' | 'stable' =
          growth > 0.1 ? 'rising' : growth < -0.1 ? 'falling' : 'stable';

        return {
          productId: keyOf(row),
          productName: row.productName,
          currentDemand: row.quantity,
          forecastedDemand: Math.max(0, forecastedDemand),
          confidence: prevQty > 0 ? 0.7 : 0.4,
          trend,
        };
      })
      .sort((a, b) => b.currentDemand - a.currentDemand)
      .slice(0, 15);

    // Revenue projection from WIB daily revenue (F1383)
    const dailyRevenue = new Map(daily.map((d) => [d.bucket, d.amount]));
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
      // Describes what the projection is actually based on (no canned "insights")
      factors: [`Rata-rata pendapatan harian dari ${dailyValues.length} hari penjualan`],
    };

    // Seasonal patterns: average transaction value per WIB weekday
    let overallTotal = 0;
    let overallCount = 0;
    const dayAvgs = new Map<number, number>();
    for (const r of byWeekday) {
      if (r.count === 0) continue;
      dayAvgs.set(Number(r.bucket), r.amount / r.count);
      overallTotal += r.amount;
      overallCount += r.count;
    }
    const overallAvgPerTx = overallCount > 0 ? overallTotal / overallCount : 0;

    const peakDays = Array.from(dayAvgs.entries())
      .filter(([, avg]) => overallAvgPerTx > 0 && avg > overallAvgPerTx * 1.1)
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => DAY_NAMES[day]);

    const seasonalPatterns: SeasonalPattern[] = [];
    if (peakDays.length > 0) {
      const maxAvg = Array.from(dayAvgs.values()).reduce((a, b) => Math.max(a, b), 0);
      const peakImpact = overallAvgPerTx > 0 ? maxAvg / overallAvgPerTx : 1;
      seasonalPatterns.push({
        pattern: 'weekly',
        description: `Penjualan lebih tinggi di hari ${peakDays.join(', ')}`,
        peakPeriods: peakDays,
        impact: Math.round(peakImpact * 100) / 100,
      });
    }

    // Anomaly detection: days > 2 stddev from mean. Causes are unknown to the
    // system, so none are invented (R10, F1014).
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
            timestamp: parseBusinessDate(dateKey).start,
            possibleCauses: [],
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
   * Generate comprehensive report. Sections run sequentially to bound the load
   * one request can put on the database (F1382).
   */
  async generateReport(
    outletId: string,
    dateRange: DateRange,
    includeCost = true,
  ): Promise<{
    sales: SalesMetrics;
    products: ProductAnalytics;
    time: TimeAnalytics;
    customers: CustomerAnalytics;
    inventory: InventoryAnalytics;
    employees: EmployeeAnalytics;
    predictions: PredictiveInsights;
  }> {
    const sales = await this.getSalesMetrics(outletId, dateRange);
    const products = await this.getProductAnalytics(outletId, dateRange, 10, includeCost);
    const time = await this.getTimeAnalytics(outletId, dateRange);
    const customers = await this.getCustomerAnalytics(outletId, dateRange);
    const inventory = await this.getInventoryAnalytics(outletId);
    const employees = await this.getEmployeeAnalytics(outletId, dateRange, includeCost);
    const predictions = await this.getPredictiveInsights(outletId, dateRange);

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
