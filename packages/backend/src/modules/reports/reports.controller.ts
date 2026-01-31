import { Controller, Get, Post, Query, Body, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GenerateSalesReportUseCase } from '../../application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '../../application/use-cases/reports/generate-inventory-report.use-case';
import { ReportsService, type CustomReportConfig } from './reports.service';

function getDateRange(dateRange?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  switch (dateRange) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    }
    case 'this_month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateSalesReport: GenerateSalesReportUseCase,
    private readonly generateInventoryReport: GenerateInventoryReportUseCase,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales report with aggregations and daily breakdown' })
  async salesReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);
    const whereClause = {
      outletId,
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    const aggregate = await this.prisma.transaction.aggregate({
      where: whereClause,
      _sum: { grandTotal: true, subtotal: true, discountAmount: true, taxAmount: true },
      _count: true,
    });

    const totalSales = aggregate._sum.grandTotal?.toNumber() || 0;
    const totalTransactions = aggregate._count;
    const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const customerCount = await this.prisma.transaction.groupBy({
      by: ['customerId'],
      where: { ...whereClause, customerId: { not: null } },
    });

    // Group sales by date for chart
    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: 'asc' },
    });

    const salesByDateMap = new Map<string, { sales: number; transactions: number }>();
    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];
      const existing = salesByDateMap.get(date) || { sales: 0, transactions: 0 };
      existing.sales += tx.grandTotal?.toNumber() || 0;
      existing.transactions += 1;
      salesByDateMap.set(date, existing);
    }

    const salesByDate = Array.from(salesByDateMap.entries()).map(([date, data]) => ({
      date,
      sales: data.sales,
      transactions: data.transactions,
    }));

    return {
      totalSales,
      totalTransactions,
      averageOrderValue,
      totalCustomers: customerCount.length,
      salesByDate,
    };
  }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Daily sales detail with payments' })
  async dailySales(@Query('outletId') outletId: string, @Query('date') date: string) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    const transactions = await this.prisma.transaction.findMany({
      where: { outletId, transactionType: 'sale', createdAt: { gte: start, lt: end } },
      include: { payments: true },
    });
    return transactions;
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory stock levels report' })
  async inventoryReport(@Query('outletId') outletId: string) {
    return this.prisma.stockLevel.findMany({
      where: { outletId },
      include: { product: true, variant: true },
    });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer analytics report' })
  async customerReport(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const totalCustomers = await this.prisma.customer.count({
      where: { businessId: user.businessId, isActive: true },
    });

    const newCustomers = await this.prisma.customer.count({
      where: {
        businessId: user.businessId,
        isActive: true,
        createdAt: { gte: start, lte: end },
      },
    });

    const topCustomers = await this.prisma.customer.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { totalSpent: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        totalSpent: true,
        visitCount: true,
      },
    });

    return {
      totalCustomers,
      newCustomers,
      returningCustomers: totalCustomers - newCustomers,
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        totalSpent: c.totalSpent?.toNumber() || 0,
        transactionCount: c.visitCount,
      })),
    };
  }

  @Get('financial')
  @ApiOperation({ summary: 'Financial report (revenue, cost, profit, margin)' })
  async financialReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);
    const whereClause = {
      outletId,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    const sales = await this.prisma.transaction.aggregate({
      where: { ...whereClause, transactionType: 'sale' },
      _sum: { grandTotal: true },
    });

    const refunds = await this.prisma.transaction.aggregate({
      where: { ...whereClause, transactionType: 'refund' },
      _sum: { grandTotal: true },
    });

    // Estimate cost from transaction items via product cost price
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: { ...whereClause, transactionType: 'sale' },
      },
      select: { quantity: true, product: { select: { costPrice: true } } },
    });

    const totalRevenue = (sales._sum.grandTotal?.toNumber() || 0) - Math.abs(refunds._sum.grandTotal?.toNumber() || 0);
    const totalCost = items.reduce((sum, item) => sum + (item.product?.costPrice?.toNumber() || 0) * item.quantity.toNumber(), 0);
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
    };
  }

  @Get('employees')
  @ApiOperation({ summary: 'Employee performance report (sales, voids, refunds, avg items per transaction)' })
  async employeeReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const employeeSales = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
        employeeId: { not: null },
      },
      _sum: { grandTotal: true },
      _count: true,
      _avg: { grandTotal: true },
    });

    const employeeIds = employeeSales
      .map((e) => e.employeeId)
      .filter((id): id is string => id !== null);

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, role: true },
    });

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Void counts per employee
    const voidCounts = await this.prisma.transaction.groupBy({
      by: ['voidedBy'],
      where: {
        outletId,
        status: 'voided',
        voidedAt: { gte: start, lte: end },
        voidedBy: { not: null },
      },
      _count: true,
    });

    const voidMap = new Map(
      voidCounts.map((v) => [v.voidedBy, v._count]),
    );

    // Refund counts per employee
    const refundCounts = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        outletId,
        transactionType: 'refund',
        createdAt: { gte: start, lte: end },
        employeeId: { not: null },
      },
      _count: true,
    });

    const refundMap = new Map(
      refundCounts.map((r) => [r.employeeId, r._count]),
    );

    // Average items per transaction per employee
    const transactionsWithItems = await this.prisma.transaction.findMany({
      where: {
        outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
        employeeId: { in: employeeIds },
      },
      select: {
        employeeId: true,
        items: { select: { quantity: true } },
      },
    });

    const employeeItemCounts = new Map<string, { totalItems: number; transactionCount: number }>();
    for (const tx of transactionsWithItems) {
      if (!tx.employeeId) continue;
      const existing = employeeItemCounts.get(tx.employeeId) || { totalItems: 0, transactionCount: 0 };
      const txItemCount = tx.items.reduce((sum, item) => sum + item.quantity.toNumber(), 0);
      existing.totalItems += txItemCount;
      existing.transactionCount += 1;
      employeeItemCounts.set(tx.employeeId, existing);
    }

    const report = employeeSales.map((es) => {
      const employee = es.employeeId ? employeeMap.get(es.employeeId) : null;
      const itemData = es.employeeId ? employeeItemCounts.get(es.employeeId) : null;
      const avgItems = itemData && itemData.transactionCount > 0
        ? Math.round((itemData.totalItems / itemData.transactionCount) * 10) / 10
        : 0;

      return {
        employeeId: es.employeeId,
        employeeName: employee?.name || 'Unknown',
        role: employee?.role || 'unknown',
        totalSales: es._sum.grandTotal?.toNumber() || 0,
        transactionCount: es._count,
        averageTransaction: es._avg.grandTotal?.toNumber() || 0,
        voidCount: es.employeeId ? (voidMap.get(es.employeeId) || 0) : 0,
        refundCount: es.employeeId ? (refundMap.get(es.employeeId) || 0) : 0,
        averageItemsPerTransaction: avgItems,
      };
    });

    report.sort((a, b) => b.totalSales - a.totalSales);

    return {
      period: { start, end },
      employees: report,
      summary: {
        totalEmployees: report.length,
        totalSales: report.reduce((s, e) => s + e.totalSales, 0),
        totalTransactions: report.reduce((s, e) => s + e.transactionCount, 0),
        totalVoids: report.reduce((s, e) => s + e.voidCount, 0),
        totalRefunds: report.reduce((s, e) => s + e.refundCount, 0),
      },
    };
  }

  @Get('kitchen')
  @ApiOperation({ summary: 'Kitchen performance report (avg prep time, orders/hour, peak hours, SLA)' })
  async kitchenReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('slaTargetMinutes') slaTargetMinutes?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);
    const slaTarget = slaTargetMinutes ? parseInt(slaTargetMinutes, 10) : 15;

    // All orders in range (both completed and not)
    const allOrders = await this.prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        items: {
          select: {
            productId: true,
            productName: true,
            station: true,
            status: true,
            startedAt: true,
            completedAt: true,
            quantity: true,
          },
        },
      },
    });

    const completedOrders = allOrders.filter((o) => o.completedAt !== null);

    // Calculate average preparation time (from creation to completion)
    const prepTimes: number[] = [];
    let slaCompliant = 0;
    for (const order of completedOrders) {
      if (order.completedAt && order.createdAt) {
        const diffMs = order.completedAt.getTime() - order.createdAt.getTime();
        const minutes = diffMs / 60000;
        prepTimes.push(minutes);
        if (minutes <= slaTarget) {
          slaCompliant++;
        }
      }
    }

    const avgPrepTime = prepTimes.length > 0
      ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length
      : 0;

    const slaAdherenceRate = completedOrders.length > 0
      ? Math.round((slaCompliant / completedOrders.length) * 100 * 10) / 10
      : 0;

    // Orders per hour calculation
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const ordersPerHour = totalHours > 0
      ? Math.round((allOrders.length / totalHours) * 10) / 10
      : 0;

    // Peak hours analysis (group by hour of day)
    const hourCounts: Record<number, number> = {};
    for (const order of allOrders) {
      const hour = order.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour, 10),
        orderCount: count,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    // Items prepared count per product
    const productStats: Record<string, { productName: string; totalPrepared: number }> = {};
    for (const order of allOrders) {
      for (const item of order.items) {
        if (item.status === 'served' || item.status === 'ready' || order.completedAt) {
          const key = item.productId || item.productName;
          if (!productStats[key]) {
            productStats[key] = { productName: item.productName, totalPrepared: 0 };
          }
          productStats[key].totalPrepared += item.quantity;
        }
      }
    }

    const itemsPreparedByProduct = Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        productName: stats.productName,
        totalPrepared: stats.totalPrepared,
      }))
      .sort((a, b) => b.totalPrepared - a.totalPrepared);

    // Items by station
    const stationStats: Record<string, { itemCount: number; totalQuantity: number; prepTimes: number[] }> = {};

    for (const order of allOrders) {
      for (const item of order.items) {
        const station = item.station || 'unassigned';
        if (!stationStats[station]) {
          stationStats[station] = { itemCount: 0, totalQuantity: 0, prepTimes: [] };
        }
        stationStats[station].itemCount += 1;
        stationStats[station].totalQuantity += item.quantity;

        if (item.completedAt && item.startedAt) {
          const diffMs = item.completedAt.getTime() - item.startedAt.getTime();
          stationStats[station].prepTimes.push(diffMs / 60000);
        }
      }
    }

    const stations = Object.entries(stationStats).map(([station, stats]) => ({
      station,
      itemCount: stats.itemCount,
      totalQuantity: stats.totalQuantity,
      avgPrepMinutes: stats.prepTimes.length > 0
        ? Math.round((stats.prepTimes.reduce((a, b) => a + b, 0) / stats.prepTimes.length) * 10) / 10
        : 0,
    }));

    // Order status breakdown
    const statusCounts = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        outletId,
        createdAt: { gte: start, lte: end },
      },
      _count: true,
    });

    return {
      period: { start, end },
      summary: {
        totalOrders: allOrders.length,
        completedOrders: completedOrders.length,
        avgPrepTimeMinutes: Math.round(avgPrepTime * 10) / 10,
        fastestPrepMinutes: prepTimes.length > 0 ? Math.round(Math.min(...prepTimes) * 10) / 10 : 0,
        slowestPrepMinutes: prepTimes.length > 0 ? Math.round(Math.max(...prepTimes) * 10) / 10 : 0,
        ordersPerHour,
        slaTargetMinutes: slaTarget,
        slaAdherenceRate,
      },
      peakHours,
      itemsPreparedByProduct,
      stations,
      orderStatusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }

  @Get('promotions')
  @ApiOperation({ summary: 'Promotion effectiveness report (revenue, discount, usage, basket size)' })
  async promotionReport(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const promotions = await this.prisma.promotion.findMany({
      where: {
        businessId: user.businessId,
        validFrom: { lte: end },
        validUntil: { gte: start },
      },
      include: {
        vouchers: {
          where: {
            usedAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            code: true,
            initialValue: true,
            remainingValue: true,
            usedAt: true,
          },
        },
      },
    });

    // Get all completed transactions in the period for basket size analysis
    const allTransactions = await this.prisma.transaction.findMany({
      where: {
        outlet: { businessId: user.businessId },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        grandTotal: true,
        discountAmount: true,
        items: {
          select: { quantity: true },
        },
      },
    });

    // Separate transactions with and without discounts for basket analysis
    const withDiscount = allTransactions.filter(
      (tx) => tx.discountAmount.toNumber() > 0,
    );
    const withoutDiscount = allTransactions.filter(
      (tx) => tx.discountAmount.toNumber() === 0,
    );

    const avgBasketWithPromo = withDiscount.length > 0
      ? Math.round(
          (withDiscount.reduce((s, tx) => s + tx.grandTotal.toNumber(), 0) /
            withDiscount.length) * 100,
        ) / 100
      : 0;

    const avgBasketWithoutPromo = withoutDiscount.length > 0
      ? Math.round(
          (withoutDiscount.reduce((s, tx) => s + tx.grandTotal.toNumber(), 0) /
            withoutDiscount.length) * 100,
        ) / 100
      : 0;

    const avgItemsWithPromo = withDiscount.length > 0
      ? Math.round(
          (withDiscount.reduce(
            (s, tx) =>
              s + tx.items.reduce((is, i) => is + i.quantity.toNumber(), 0),
            0,
          ) /
            withDiscount.length) * 10,
        ) / 10
      : 0;

    const avgItemsWithoutPromo = withoutDiscount.length > 0
      ? Math.round(
          (withoutDiscount.reduce(
            (s, tx) =>
              s + tx.items.reduce((is, i) => is + i.quantity.toNumber(), 0),
            0,
          ) /
            withoutDiscount.length) * 10,
        ) / 10
      : 0;

    const report = promotions.map((promo) => {
      const vouchersUsed = promo.vouchers.filter((v) => v.usedAt !== null);
      const totalDiscountGiven = vouchersUsed.reduce((sum, v) => {
        const initial = v.initialValue?.toNumber() || 0;
        const remaining = v.remainingValue?.toNumber() || 0;
        return sum + (initial - remaining);
      }, 0);

      // Estimate revenue attributed to this promotion
      const revenueByPromo = vouchersUsed.reduce((sum, v) => {
        return sum + (v.initialValue?.toNumber() || 0);
      }, 0);

      return {
        promotionId: promo.id,
        name: promo.name,
        discountType: promo.discountType,
        discountValue: promo.discountValue.toNumber(),
        validFrom: promo.validFrom,
        validUntil: promo.validUntil,
        usageLimit: promo.usageLimit,
        usedCount: promo.usedCount,
        vouchersRedeemed: vouchersUsed.length,
        totalDiscountGiven,
        revenueAttributed: revenueByPromo,
        isActive: promo.isActive,
        utilizationRate: promo.usageLimit
          ? Math.round((promo.usedCount / promo.usageLimit) * 100 * 10) / 10
          : null,
      };
    });

    report.sort((a, b) => b.usedCount - a.usedCount);

    const topPerforming = [...report]
      .sort((a, b) => b.revenueAttributed - a.revenueAttributed)
      .slice(0, 5);

    return {
      period: { start, end },
      promotions: report,
      summary: {
        totalPromotions: report.length,
        totalRedemptions: report.reduce((s, p) => s + p.usedCount, 0),
        totalDiscountGiven: report.reduce((s, p) => s + p.totalDiscountGiven, 0),
        totalRevenueAttributed: report.reduce((s, p) => s + p.revenueAttributed, 0),
      },
      basketSizeAnalysis: {
        avgBasketWithPromo,
        avgBasketWithoutPromo,
        avgItemsWithPromo,
        avgItemsWithoutPromo,
        transactionsWithPromo: withDiscount.length,
        transactionsWithoutPromo: withoutDiscount.length,
      },
      topPerformingPromotions: topPerforming.map((p) => ({
        promotionId: p.promotionId,
        name: p.name,
        usedCount: p.usedCount,
        revenueAttributed: p.revenueAttributed,
        totalDiscountGiven: p.totalDiscountGiven,
      })),
    };
  }

  @Get('sales/export')
  @ApiOperation({ summary: 'Export sales report as PDF or Excel' })
  async exportSalesReport(
    @Query('outletId') outletId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'pdf' | 'excel',
    @Res() res: Response,
  ) {
    const result = await this.generateSalesReport.execute({ outletId, startDate, endDate, format });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }

  @Get('inventory/export')
  @ApiOperation({ summary: 'Export inventory report as PDF or Excel' })
  async exportInventoryReport(
    @Query('outletId') outletId: string,
    @Query('format') format: 'pdf' | 'excel',
    @Res() res: Response,
  ) {
    const result = await this.generateInventoryReport.execute({ outletId, format });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }

  // ======================================================================
  // CUSTOM REPORT BUILDER
  // ======================================================================

  @Post('custom')
  @ApiOperation({
    summary: 'Build a custom report with user-defined metrics, dimensions, and filters',
  })
  async buildCustomReport(
    @CurrentUser() user: AuthUser,
    @Body() config: CustomReportConfig,
  ) {
    return this.reportsService.buildCustomReport(user.businessId, config);
  }

  @Get('custom/metrics')
  @ApiOperation({
    summary: 'Get available metrics and dimensions for the custom report builder',
  })
  getAvailableMetrics() {
    return this.reportsService.getAvailableMetrics();
  }

  @Post('custom/templates')
  @ApiOperation({
    summary: 'Save a report configuration as a reusable template',
  })
  async saveReportTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: { name: string; config: CustomReportConfig },
  ) {
    return this.reportsService.saveReportTemplate(
      user.businessId,
      dto.name,
      dto.config,
    );
  }

  @Get('custom/templates')
  @ApiOperation({
    summary: 'List saved report templates for the business',
  })
  async getSavedTemplates(@CurrentUser() user: AuthUser) {
    return this.reportsService.getSavedTemplates(user.businessId);
  }
}
