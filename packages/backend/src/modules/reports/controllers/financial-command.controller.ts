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
import { computeProfit } from '../utils/profit.util';

/**
 * Financial Command Controller
 * Advanced financial analytics for business owners.
 *
 * Definitions (see utils/profit.util.ts):
 * - revenue  = net sales excl. tax (subtotal - discount) minus completed refunds
 * - expenses = COGS. Received purchase orders are inventory purchases, reported
 *              only as cash out / informational, never added to expenses.
 */
@ApiTags('Financial Command')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
@Controller('owner/financial')
export class FinancialCommandController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  /** Completed sale/refund totals grouped by outlet (single query each). */
  private async salesAndRefundsByOutlet(outletIds: string[], start: Date, end: Date) {
    if (outletIds.length === 0) {
      return { sales: new Map(), refunds: new Map() } as {
        sales: Map<string, { subtotal: number; discount: number; tax: number; grand: number }>;
        refunds: Map<string, number>;
      };
    }
    const base = {
      outletId: { in: outletIds },
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };
    const [sales, refunds] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['outletId'],
        where: { ...base, transactionType: 'sale' },
        _sum: { subtotal: true, discountAmount: true, taxAmount: true, grandTotal: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['outletId'],
        where: { ...base, transactionType: 'refund' },
        _sum: { subtotal: true },
      }),
    ]);
    return {
      sales: new Map(
        sales.map((s) => [
          s.outletId,
          {
            subtotal: toNumber(s._sum.subtotal),
            discount: toNumber(s._sum.discountAmount),
            tax: toNumber(s._sum.taxAmount),
            grand: toNumber(s._sum.grandTotal),
          },
        ]),
      ),
      refunds: new Map(refunds.map((r) => [r.outletId, toNumber(money(r._sum.subtotal).abs())])),
    };
  }

  @Get('revenue-expense')
  @ApiOperation({ summary: 'Revenue vs Expense analysis' })
  async getRevenueExpense(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // A requested outlet must belong to the caller's business (R3)
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);

    if (outletIds.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        revenueByDate: [],
        expensesByDate: [],
      };
    }

    const cacheKey = `financial:revenue-expense:${user.businessId}:${outletIds.join(',')}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const scope = { outletIds, start, end };
    const [
      salesAggregate,
      refundAggregate,
      totalCOGS,
      purchaseOrders,
      revenueDays,
      cogsDays,
      refundDays,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          outletId: { in: outletIds },
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: { subtotal: true, taxAmount: true, discountAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          outletId: { in: outletIds },
          transactionType: 'refund',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: { subtotal: true },
      }),
      this.queries.cogs(scope),
      // Purchases by receivedAt (F1033) — informational only
      this.prisma.purchaseOrder.aggregate({
        where: {
          outletId: { in: outletIds },
          status: 'received',
          receivedAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      }),
      this.queries.salesByDay(scope, 'net'),
      this.queries.cogsByDay(scope),
      this.queries.refundsByDay(scope),
    ]);

    const totalRefunds = toNumber(money(refundAggregate._sum.subtotal).abs());
    const totalDiscounts = toNumber(salesAggregate._sum.discountAmount);
    const profit = computeProfit({
      grossSales: salesAggregate._sum.subtotal,
      discounts: salesAggregate._sum.discountAmount,
      refunds: totalRefunds,
      cogs: totalCOGS,
    });

    // Daily series in WIB (F1032): revenue = net sales - refunds, expenses = COGS
    const revenueByDateMap = new Map<string, number>();
    for (const d of revenueDays) revenueByDateMap.set(d.bucket, d.amount);
    for (const [date, r] of refundDays) {
      revenueByDateMap.set(date, (revenueByDateMap.get(date) || 0) - r.amount);
    }

    const revenueByDate = Array.from(revenueByDateMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const expensesByDate = Array.from(cogsDays.entries())
      .map(([date, expenses]) => ({ date, expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result = {
      totalRevenue: profit.netRevenue,
      totalExpenses: profit.expenses,
      netProfit: profit.netProfit,
      profitMargin: profit.profitMargin,
      breakdown: {
        cogs: totalCOGS,
        // Inventory purchased in the period: cash out, NOT part of totalExpenses
        purchases: toNumber(purchaseOrders._sum?.totalAmount),
        refunds: totalRefunds,
        discounts: totalDiscounts,
        tax: toNumber(salesAggregate._sum.taxAmount),
      },
      revenueByDate,
      expensesByDate,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('profit-by-outlet')
  @ApiOperation({ summary: 'Profit analysis by outlet' })
  async getProfitByOutlet(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `financial:profit-by-outlet:${user.businessId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // Grouped queries instead of per-outlet loops (F1030)
    const [{ sales, refunds }, cogsByOutlet] = await Promise.all([
      this.salesAndRefundsByOutlet(outletIds, start, end),
      this.queries.cogsByOutlet({ outletIds, start, end }),
    ]);

    const outletProfits = outlets.map((outlet) => {
      const s = sales.get(outlet.id) ?? { subtotal: 0, discount: 0, tax: 0, grand: 0 };
      const refundAmount = refunds.get(outlet.id) ?? 0;
      const cogs = cogsByOutlet.get(outlet.id) ?? 0;
      // Discount subtracted once, tax excluded (F1028)
      const p = computeProfit({
        grossSales: s.subtotal,
        discounts: s.discount,
        refunds: refundAmount,
        cogs,
      });

      return {
        outletId: outlet.id,
        outletName: outlet.name,
        revenue: p.netRevenue,
        expenses: p.expenses,
        profit: p.netProfit,
        profitMargin: p.profitMargin,
        breakdown: {
          cogs,
          refunds: refundAmount,
          discounts: s.discount,
        },
      };
    });

    outletProfits.sort((a, b) => b.profit - a.profit);

    const result = { outlets: outletProfits };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Cash flow monitoring (in vs out)' })
  async getCashFlow(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outletIds = await this.tenant.resolveOutletIds(user);
    const scope = { outletIds, start, end };

    // All aggregated in SQL, keyed by WIB day (F1031/F1032)
    const [byMethod, cashInByDate, purchasesByDate, refundsByDate] = await Promise.all([
      outletIds.length > 0
        ? this.prisma.payment.groupBy({
            by: ['paymentMethod'],
            where: {
              transaction: {
                outletId: { in: outletIds },
                transactionType: 'sale',
                status: 'completed',
                createdAt: { gte: start, lte: end },
              },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      this.queries.paymentsByDay(scope),
      this.queries.purchasesByDay(scope),
      this.queries.refundsByDay(scope),
    ]);

    const cashOutByDate = new Map<string, number>(purchasesByDate);
    for (const [date, r] of refundsByDate) {
      cashOutByDate.set(date, (cashOutByDate.get(date) || 0) + r.grandTotal);
    }

    const allDates = new Set([...cashInByDate.keys(), ...cashOutByDate.keys()]);
    const cashFlowByDate = Array.from(allDates)
      .map((date) => {
        const cashIn = cashInByDate.get(date) || 0;
        const cashOut = cashOutByDate.get(date) || 0;
        return { date, cashIn, cashOut, netCashFlow: cashIn - cashOut };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const cashInByMethod = byMethod.map((m) => ({
      method: m.paymentMethod as string,
      amount: toNumber(m._sum.amount),
    }));
    const totalCashIn = cashInByMethod.reduce((sum, v) => sum + v.amount, 0);
    const totalCashOut = Array.from(cashOutByDate.values()).reduce((sum, v) => sum + v, 0);

    return {
      totalCashIn,
      totalCashOut,
      netCashFlow: totalCashIn - totalCashOut,
      cashInByMethod,
      cashFlowByDate,
    };
  }

  @Get('payment-methods-analysis')
  @ApiOperation({ summary: 'Detailed payment methods breakdown' })
  async getPaymentMethodsAnalysis(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outletIds = await this.tenant.resolveOutletIds(user);

    const payments = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        transaction: {
          outletId: { in: outletIds },
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const methods = payments.map((p) => ({
      method: p.paymentMethod,
      totalAmount: p._sum.amount?.toNumber() || 0,
      transactionCount: p._count,
      avgTransactionValue: p._count > 0 ? (p._sum.amount?.toNumber() || 0) / p._count : 0,
    }));

    methods.sort((a, b) => b.totalAmount - a.totalAmount);

    const totalAmount = methods.reduce((sum, m) => sum + m.totalAmount, 0);

    return {
      methods,
      totalAmount,
      totalTransactions: methods.reduce((sum, m) => sum + m.transactionCount, 0),
    };
  }

  @Get('expense-categories')
  @ApiOperation({ summary: 'Breakdown of expense categories' })
  async getExpenseCategories(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outletIds = await this.tenant.resolveOutletIds(user);
    const base = {
      outletId: { in: outletIds },
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    const [totalCOGS, purchases, refunds, discounts] = await Promise.all([
      this.queries.cogs({ outletIds, start, end }),
      this.prisma.purchaseOrder.aggregate({
        where: {
          outletId: { in: outletIds },
          status: 'received',
          receivedAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...base, transactionType: 'refund' },
        _sum: { subtotal: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...base, transactionType: 'sale' },
        _sum: { discountAmount: true },
      }),
    ]);

    // Only COGS is an expense. Refunds and discounts reduce revenue (contra-revenue)
    // and purchases are inventory cash-out; none of them is added to totalExpenses (F1029).
    const categories = [
      {
        category: 'Cost of Goods Sold',
        amount: totalCOGS,
        description: 'Biaya produk yang terjual',
      },
    ];

    const contraRevenue = [
      {
        category: 'Refunds',
        amount: toNumber(money(refunds._sum.subtotal).abs()),
        description: 'Pengembalian dana pelanggan (mengurangi pendapatan)',
      },
      {
        category: 'Discounts',
        amount: toNumber(discounts._sum.discountAmount),
        description: 'Diskon yang diberikan (mengurangi pendapatan)',
      },
    ].sort((a, b) => b.amount - a.amount);

    return {
      categories,
      totalExpenses: totalCOGS,
      contraRevenue,
      purchases: {
        amount: toNumber(purchases._sum?.totalAmount),
        description: 'Pembelian dari supplier (arus kas keluar, bukan beban)',
      },
    };
  }
}
