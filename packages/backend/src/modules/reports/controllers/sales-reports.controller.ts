import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { parseBusinessDate } from '@shared/utils/business-time';
import { toPrismaPage } from '@shared/dtos/pagination-query.dto';
import { GenerateSalesReportUseCase } from '../../../application/use-cases/reports/generate-sales-report.use-case';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import {
  DailySalesQueryDto,
  ReportExportQueryDto,
  ReportQueryDto,
} from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class SalesReportsController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
    private readonly generateSalesReport: GenerateSalesReportUseCase,
  ) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales report with aggregations and daily breakdown' })
  async salesReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

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

    // Daily buckets in WIB, aggregated in SQL
    const salesByDate = (
      await this.queries.salesByDay({ outletIds: [outletId], start, end }, 'grand_total')
    ).map((row) => ({ date: row.bucket, sales: row.amount, transactions: row.count }));

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
  @ApiOperation({
    summary: 'Detailed sales summary with breakdown (gross, net, tax, service charge)',
  })
  async salesSummary(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

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
      _sum: {
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        serviceCharge: true,
        grandTotal: true,
      },
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
  async discountBreakdown(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

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

    // Promotion breakdown: only voucher redemptions are recorded per promotion.
    // Transactions do not store which promotion produced a discount, so the
    // per-promotion discount amount is unknown (null) rather than a fake 0 (F0944).
    const voucherUse = await this.prisma.voucher.groupBy({
      by: ['promotionId'],
      where: {
        businessId: user.businessId,
        usedAt: { gte: start, lte: end },
        promotionId: { not: null },
      },
      _count: { _all: true },
    });

    const promotionIds = voucherUse
      .map((v) => v.promotionId)
      .filter((id): id is string => id !== null);
    const promotions =
      promotionIds.length > 0
        ? await this.prisma.promotion.findMany({
            where: { id: { in: promotionIds }, businessId: user.businessId },
            select: { id: true, name: true },
          })
        : [];

    const promotionNameMap = new Map(promotions.map((p) => [p.id, p.name]));

    const promotionBreakdown = voucherUse
      .filter((v) => v.promotionId)
      .map((v) => ({
        promotionId: v.promotionId as string,
        name: promotionNameMap.get(v.promotionId as string) || 'Unknown Promotion',
        usedCount: v._count._all,
        totalDiscount: null as number | null,
      }))
      .sort((a, b) => b.usedCount - a.usedCount);

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
  async dailySales(@CurrentUser() user: AuthUser, @Query() query: DailySalesQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    // WIB business day (R14); completed sales only
    const { start, end } = parseBusinessDate(query.date);
    const { skip, take } = toPrismaPage({ page: query.page, limit: query.limit ?? 100 });
    return this.prisma.transaction.findMany({
      where: {
        outletId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        receiptNumber: true,
        createdAt: true,
        orderType: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        serviceCharge: true,
        grandTotal: true,
        status: true,
        payments: { select: { paymentMethod: true, amount: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
  }

  @Get('sales/export')
  @ApiOperation({ summary: 'Export sales report as PDF or Excel' })
  async exportSalesReport(
    @CurrentUser() user: AuthUser,
    @Query() query: ReportExportQueryDto,
    @Res() res: Response,
  ) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

    const result = await this.generateSalesReport.execute({
      businessId: user.businessId,
      outletId,
      startDate: query.startDate,
      endDate: query.endDate,
      format: query.format,
    });
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }
}
