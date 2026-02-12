import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { GenerateSalesReportUseCase } from '../../../application/use-cases/reports/generate-sales-report.use-case';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class SalesReportsController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly generateSalesReport: GenerateSalesReportUseCase,
  ) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales report with aggregations and daily breakdown' })
  async salesReport(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
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

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Check cache
    const cacheKey = `report:sales:${outletId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

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

    const result = {
      totalSales,
      totalTransactions,
      averageOrderValue,
      totalCustomers: customerCount.length,
      salesByDate,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('sales/summary')
  @ApiOperation({ summary: 'Detailed sales summary with breakdown (gross, net, tax, service charge)' })
  async salesSummary(
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

    const cacheKey = `report:sales:summary:${outletId}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const saleWhere = {
      outletId,
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    const saleAggregate = await this.prisma.transaction.aggregate({
      where: saleWhere,
      _sum: { subtotal: true, discountAmount: true, taxAmount: true, serviceCharge: true, grandTotal: true },
      _count: true,
    });

    const refundAggregate = await this.prisma.transaction.aggregate({
      where: {
        outletId,
        transactionType: 'refund' as const,
        status: 'completed' as const,
        createdAt: { gte: start, lte: end },
      },
      _sum: { grandTotal: true },
      _count: true,
    });

    const grossSales = saleAggregate._sum.subtotal?.toNumber() || 0;
    const discountAmount = saleAggregate._sum.discountAmount?.toNumber() || 0;
    const refundAmount = refundAggregate._sum.grandTotal?.toNumber() || 0;
    const netSales = grossSales - discountAmount;
    const taxAmount = saleAggregate._sum.taxAmount?.toNumber() || 0;
    const serviceCharge = saleAggregate._sum.serviceCharge?.toNumber() || 0;
    const saleGrandTotal = saleAggregate._sum.grandTotal?.toNumber() || 0;
    const roundingAmount = saleGrandTotal - (netSales + taxAmount + serviceCharge);
    const totalCollected = saleGrandTotal - refundAmount;
    const totalTransactions = saleAggregate._count;
    const refundTransactions = refundAggregate._count;
    const averageOrderValue = totalTransactions > 0 ? totalCollected / totalTransactions : 0;

    const result = {
      grossSales,
      discountAmount,
      refundAmount,
      netSales,
      taxAmount,
      serviceCharge,
      roundingAmount,
      totalCollected,
      totalTransactions,
      refundTransactions,
      averageOrderValue,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('sales/discount-breakdown')
  @ApiOperation({ summary: 'Discount breakdown with promotion detail' })
  async discountBreakdown(
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

    const saleWhere = {
      outletId,
      transactionType: 'sale' as const,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    // Transaction-level discount
    const txDiscountAgg = await this.prisma.transaction.aggregate({
      where: saleWhere,
      _sum: { discountAmount: true },
      _count: true,
    });

    // Item-level discount
    const itemDiscountAgg = await this.prisma.transactionItem.aggregate({
      where: { transaction: saleWhere },
      _sum: { discountAmount: true },
    });

    const transactionLevelDiscount = txDiscountAgg._sum.discountAmount?.toNumber() || 0;
    const itemLevelDiscount = itemDiscountAgg._sum.discountAmount?.toNumber() || 0;
    const totalDiscount = transactionLevelDiscount + itemLevelDiscount;
    const totalTransactions = txDiscountAgg._count;

    // Count transactions with discount
    const withDiscount = await this.prisma.transaction.count({
      where: { ...saleWhere, discountAmount: { gt: 0 } },
    });

    // Promotion breakdown via vouchers
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        business: { id: user.businessId },
        usedAt: { gte: start, lte: end },
        promotionId: { not: null },
      },
      select: { promotionId: true, initialValue: true },
    });

    const promoMap = new Map<string, { usedCount: number; totalDiscount: number }>();
    for (const v of vouchers) {
      if (!v.promotionId) continue;
      const existing = promoMap.get(v.promotionId) || { usedCount: 0, totalDiscount: 0 };
      existing.usedCount += 1;
      existing.totalDiscount += v.initialValue?.toNumber() || 0;
      promoMap.set(v.promotionId, existing);
    }

    const promotionIds = Array.from(promoMap.keys());
    const promotions = promotionIds.length > 0
      ? await this.prisma.promotion.findMany({
          where: { id: { in: promotionIds } },
          select: { id: true, name: true },
        })
      : [];

    const promotionNameMap = new Map(promotions.map((p) => [p.id, p.name]));

    const promotionBreakdown = Array.from(promoMap.entries()).map(([promotionId, data]) => ({
      promotionId,
      name: promotionNameMap.get(promotionId) || 'Unknown Promotion',
      usedCount: data.usedCount,
      totalDiscount: data.totalDiscount,
    }));

    promotionBreakdown.sort((a, b) => b.totalDiscount - a.totalDiscount);

    return {
      totalDiscount,
      transactionLevelDiscount,
      itemLevelDiscount,
      transactionsWithDiscount: withDiscount,
      transactionsWithoutDiscount: totalTransactions - withDiscount,
      promotionBreakdown,
    };
  }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Daily sales detail with payments' })
  async dailySales(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('date') date: string,
  ) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    const transactions = await this.prisma.transaction.findMany({
      where: { outletId, transactionType: 'sale', createdAt: { gte: start, lt: end } },
      include: { payments: true },
    });
    return transactions;
  }

  @Get('sales/export')
  @ApiOperation({ summary: 'Export sales report as PDF or Excel' })
  async exportSalesReport(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'pdf' | 'excel',
    @Res() res: Response,
  ) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const result = await this.generateSalesReport.execute({ outletId, startDate, endDate, format });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }
}
