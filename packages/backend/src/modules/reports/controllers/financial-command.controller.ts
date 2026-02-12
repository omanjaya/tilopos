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
 * Financial Command Controller
 * Advanced financial analytics for business owners.
 */
@ApiTags('Financial Command')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
@Controller('owner/financial')
export class FinancialCommandController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('revenue-expense')
  @ApiOperation({ summary: 'Revenue vs Expense analysis' })
  async getRevenueExpense(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('outletId') outletId?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Get outlet IDs
    const outlets = await this.prisma.outlet.findMany({
      where: {
        businessId: user.businessId,
        ...(outletId ? { id: outletId } : {}),
      },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

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

    // Calculate Revenue (completed sales)
    const salesAggregate = await this.prisma.transaction.aggregate({
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        grandTotal: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true,
      },
      _count: true,
    });

    const totalRevenue = salesAggregate._sum.grandTotal?.toNumber() || 0;
    const totalTax = salesAggregate._sum.taxAmount?.toNumber() || 0;
    const totalDiscounts = salesAggregate._sum.discountAmount?.toNumber() || 0;

    // Calculate Expenses
    // 1. Cost of Goods Sold (COGS)
    const salesWithCost = await this.prisma.transaction.findMany({
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
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

    let totalCOGS = 0;
    for (const tx of salesWithCost) {
      for (const item of tx.items) {
        if (item.product?.costPrice) {
          totalCOGS += Number(item.quantity) * item.product.costPrice.toNumber();
        }
      }
    }

    // 2. Purchase Orders (direct expenses)
    const purchaseOrders = await this.prisma.purchaseOrder.aggregate({
      where: {
        outletId: { in: outletIds },
        status: 'COMPLETED' as any,
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalPurchases = purchaseOrders._sum?.totalAmount?.toNumber() || 0;

    // 3. Refunds (revenue loss)
    const refunds = await this.prisma.transaction.aggregate({
      where: {
        outletId: { in: outletIds },
        transactionType: 'refund',
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        grandTotal: true,
      },
    });

    const totalRefunds = Math.abs(refunds._sum.grandTotal?.toNumber() || 0);

    // Total Expenses = COGS + Purchases + Refunds + Discounts
    const totalExpenses = totalCOGS + totalPurchases + totalRefunds + totalDiscounts;

    // Net Profit
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Revenue & Expenses by Date for chart
    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId: { in: outletIds },
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        grandTotal: true,
        transactionType: true,
        status: true,
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
      orderBy: { createdAt: 'asc' },
    });

    const revenueByDateMap = new Map<string, number>();
    const expensesByDateMap = new Map<string, number>();

    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];

      if (tx.transactionType === 'sale' && tx.status === 'completed') {
        const revenue = tx.grandTotal?.toNumber() || 0;
        revenueByDateMap.set(date, (revenueByDateMap.get(date) || 0) + revenue);

        // Calculate COGS for this transaction
        let txCOGS = 0;
        for (const item of tx.items) {
          if (item.product?.costPrice) {
            txCOGS += Number(item.quantity) * item.product.costPrice.toNumber();
          }
        }
        expensesByDateMap.set(date, (expensesByDateMap.get(date) || 0) + txCOGS);
      } else if (tx.transactionType === 'refund') {
        const refundAmount = Math.abs(tx.grandTotal?.toNumber() || 0);
        expensesByDateMap.set(date, (expensesByDateMap.get(date) || 0) + refundAmount);
      }
    }

    const revenueByDate = Array.from(revenueByDateMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const expensesByDate = Array.from(expensesByDateMap.entries())
      .map(([date, expenses]) => ({ date, expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      breakdown: {
        cogs: totalCOGS,
        purchases: totalPurchases,
        refunds: totalRefunds,
        discounts: totalDiscounts,
        tax: totalTax,
      },
      revenueByDate,
      expensesByDate,
    };
  }

  @Get('profit-by-outlet')
  @ApiOperation({ summary: 'Profit analysis by outlet' })
  async getProfitByOutlet(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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

    const outletProfits = [];

    for (const outlet of outlets) {
      // Revenue
      const salesAggregate = await this.prisma.transaction.aggregate({
        where: {
          outletId: outlet.id,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: { grandTotal: true, discountAmount: true },
      });

      const revenue = salesAggregate._sum.grandTotal?.toNumber() || 0;
      const discounts = salesAggregate._sum.discountAmount?.toNumber() || 0;

      // COGS
      const salesWithCost = await this.prisma.transaction.findMany({
        where: {
          outletId: outlet.id,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        select: {
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

      let cogs = 0;
      for (const tx of salesWithCost) {
        for (const item of tx.items) {
          if (item.product?.costPrice) {
            cogs += Number(item.quantity) * item.product.costPrice.toNumber();
          }
        }
      }

      // Refunds
      const refunds = await this.prisma.transaction.aggregate({
        where: {
          outletId: outlet.id,
          transactionType: 'refund',
          createdAt: { gte: start, lte: end },
        },
        _sum: { grandTotal: true },
      });

      const refundAmount = Math.abs(refunds._sum.grandTotal?.toNumber() || 0);

      const expenses = cogs + refundAmount + discounts;
      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      outletProfits.push({
        outletId: outlet.id,
        outletName: outlet.name,
        revenue,
        expenses,
        profit,
        profitMargin,
        breakdown: {
          cogs,
          refunds: refundAmount,
          discounts,
        },
      });
    }

    // Sort by profit descending
    outletProfits.sort((a, b) => b.profit - a.profit);

    const result = { outlets: outletProfits };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Cash flow monitoring (in vs out)' })
  async getCashFlow(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // Cash IN: Completed payments
    const payments = await this.prisma.payment.findMany({
      where: {
        transaction: {
          outletId: { in: outletIds },
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
      },
      select: {
        amount: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    // Group by payment method
    const cashInByMethod = new Map<string, number>();
    const cashInByDate = new Map<string, number>();

    for (const payment of payments) {
      const method = payment.paymentMethod;
      const amount = payment.amount.toNumber();
      const date = payment.createdAt.toISOString().split('T')[0];

      cashInByMethod.set(method, (cashInByMethod.get(method) || 0) + amount);
      cashInByDate.set(date, (cashInByDate.get(date) || 0) + amount);
    }

    // Cash OUT: Purchase orders + Refunds
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        outletId: { in: outletIds },
        status: 'COMPLETED' as any,
        createdAt: { gte: start, lte: end },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const refundTransactions = await this.prisma.transaction.findMany({
      where: {
        outletId: { in: outletIds },
        transactionType: 'refund',
        createdAt: { gte: start, lte: end },
      },
      select: {
        grandTotal: true,
        createdAt: true,
      },
    });

    const cashOutByDate = new Map<string, number>();

    for (const po of purchaseOrders) {
      const date = po.createdAt.toISOString().split('T')[0];
      const amount = po.totalAmount.toNumber();
      cashOutByDate.set(date, (cashOutByDate.get(date) || 0) + amount);
    }

    for (const refund of refundTransactions) {
      const date = refund.createdAt.toISOString().split('T')[0];
      const amount = Math.abs(refund.grandTotal?.toNumber() || 0);
      cashOutByDate.set(date, (cashOutByDate.get(date) || 0) + amount);
    }

    // Combine for net cash flow by date
    const allDates = new Set([...cashInByDate.keys(), ...cashOutByDate.keys()]);
    const cashFlowByDate = Array.from(allDates)
      .map((date) => {
        const cashIn = cashInByDate.get(date) || 0;
        const cashOut = cashOutByDate.get(date) || 0;
        const netCashFlow = cashIn - cashOut;

        return { date, cashIn, cashOut, netCashFlow };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalCashIn = Array.from(cashInByMethod.values()).reduce((sum, v) => sum + v, 0);
    const totalCashOut = Array.from(cashOutByDate.values()).reduce((sum, v) => sum + v, 0);
    const netCashFlow = totalCashIn - totalCashOut;

    return {
      totalCashIn,
      totalCashOut,
      netCashFlow,
      cashInByMethod: Array.from(cashInByMethod.entries()).map(([method, amount]) => ({
        method,
        amount,
      })),
      cashFlowByDate,
    };
  }

  @Get('payment-methods-analysis')
  @ApiOperation({ summary: 'Detailed payment methods breakdown' })
  async getPaymentMethodsAnalysis(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

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
      avgTransactionValue:
        p._count > 0 ? (p._sum.amount?.toNumber() || 0) / p._count : 0,
    }));

    // Sort by total amount descending
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
  async getExpenseCategories(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // 1. COGS (Cost of Goods Sold)
    const salesWithCost = await this.prisma.transaction.findMany({
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
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

    let totalCOGS = 0;
    for (const tx of salesWithCost) {
      for (const item of tx.items) {
        if (item.product?.costPrice) {
          totalCOGS += Number(item.quantity) * item.product.costPrice.toNumber();
        }
      }
    }

    // 2. Purchases
    const purchases = await this.prisma.purchaseOrder.aggregate({
      where: {
        outletId: { in: outletIds },
        status: 'COMPLETED' as any,
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        totalAmount: true,
      },
    });
    const totalPurchases = purchases._sum?.totalAmount?.toNumber() || 0;

    // 3. Refunds
    const refunds = await this.prisma.transaction.aggregate({
      where: {
        outletId: { in: outletIds },
        transactionType: 'refund',
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        grandTotal: true,
      },
    });
    const totalRefunds = Math.abs(refunds._sum.grandTotal?.toNumber() || 0);

    // 4. Discounts
    const discounts = await this.prisma.transaction.aggregate({
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        discountAmount: true,
      },
    });
    const totalDiscounts = discounts._sum.discountAmount?.toNumber() || 0;

    const categories = [
      {
        category: 'Cost of Goods Sold',
        amount: totalCOGS,
        description: 'Biaya produk yang terjual',
      },
      {
        category: 'Purchases',
        amount: totalPurchases,
        description: 'Pembelian dari supplier',
      },
      {
        category: 'Refunds',
        amount: totalRefunds,
        description: 'Pengembalian dana pelanggan',
      },
      {
        category: 'Discounts',
        amount: totalDiscounts,
        description: 'Diskon yang diberikan',
      },
    ];

    // Sort by amount descending
    categories.sort((a, b) => b.amount - a.amount);

    const totalExpenses = categories.reduce((sum, c) => sum + c.amount, 0);

    return {
      categories,
      totalExpenses,
    };
  }
}
