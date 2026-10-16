import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { toPrismaPage } from '@shared/dtos/pagination-query.dto';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import {
  InvoiceListQueryDto,
  ReportSearchQueryDto,
} from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';

/** Max rows returned by the items summary (R13). */
const MAX_ITEM_ROWS = 1000;

@ApiTags('Reports - Invoices')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports/invoices')
export class InvoiceReportsController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Invoice list with summary' })
  async invoiceList(@CurrentUser() user: AuthUser, @Query() query: InvoiceListQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { startDate, endDate, search, status } = query;

    const { start, end } = getDateRange(undefined, startDate, endDate);
    const pageNum = query.page ?? 1;
    const limitNum = query.limit ?? 50;
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `report:invoices:${outletId}:${startDate}:${endDate}:${search}:${status}:${pageNum}:${limitNum}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const baseWhere = {
      outletId,
      transactionType: 'sale' as const,
      createdAt: { gte: start, lte: end },
      ...(status && status !== 'all' ? { status } : {}),
      ...(search
        ? {
            OR: [
              { receiptNumber: { contains: search, mode: 'insensitive' as const } },
              { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [transactions, totalCount, aggregate] = await Promise.all([
      this.prisma.transaction.findMany({
        where: baseWhere,
        include: {
          employee: { select: { name: true } },
          customer: { select: { name: true } },
          payments: { select: { paymentMethod: true, amount: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.transaction.count({ where: baseWhere }),
      this.prisma.transaction.aggregate({
        where: baseWhere,
        _sum: { grandTotal: true, taxAmount: true, discountAmount: true },
        _count: true,
      }),
    ]);

    const invoices = transactions.map((tx) => ({
      id: tx.id,
      invoiceNumber: tx.receiptNumber,
      date: tx.createdAt.toISOString(),
      customerName: tx.customer?.name || null,
      employeeName: tx.employee?.name || '-',
      itemCount: tx._count.items,
      subtotal: tx.subtotal?.toNumber() || 0,
      discount: tx.discountAmount?.toNumber() || 0,
      tax: tx.taxAmount?.toNumber() || 0,
      grandTotal: tx.grandTotal?.toNumber() || 0,
      paymentMethod: tx.payments.map((p) => p.paymentMethod).join(', ') || '-',
      status: tx.status,
    }));

    const result = {
      invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      summary: {
        totalInvoices: aggregate._count,
        totalAmount: aggregate._sum.grandTotal?.toNumber() || 0,
        totalTax: aggregate._sum.taxAmount?.toNumber() || 0,
        totalDiscount: aggregate._sum.discountAmount?.toNumber() || 0,
      },
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Transaction summary grouped by date' })
  async transactionsSummary(@CurrentUser() user: AuthUser, @Query() query: ReportSearchQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { startDate, endDate, search } = query;
    const { skip, take } = toPrismaPage({ page: query.page, limit: query.limit ?? 100 });

    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:invoices:transactions:${outletId}:${startDate}:${endDate}:${search}:${skip}:${take}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const baseWhere = {
      outletId,
      transactionType: 'sale' as const,
      createdAt: { gte: start, lte: end },
      ...(search
        ? {
            OR: [{ receiptNumber: { contains: search, mode: 'insensitive' as const } }],
          }
        : {}),
    };

    // Paginated list (F1004) + daily totals aggregated in SQL by WIB day (F1006)
    const [transactions, total, days] = await Promise.all([
      this.prisma.transaction.findMany({
        where: baseWhere,
        include: {
          employee: { select: { name: true } },
          customer: { select: { name: true } },
          payments: { select: { paymentMethod: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.transaction.count({ where: baseWhere }),
      this.queries.invoicesByDay({ outletIds: [outletId], start, end }, search),
    ]);

    const transactionList = transactions.map((tx) => ({
      id: tx.id,
      receiptNumber: tx.receiptNumber,
      date: tx.createdAt.toISOString(),
      employeeName: tx.employee?.name || '-',
      customerName: tx.customer?.name || null,
      grandTotal: tx.grandTotal?.toNumber() || 0,
      paymentMethods: tx.payments.map((p) => p.paymentMethod),
      status: tx.status,
    }));

    const dailySummary = days.map((d) => ({ date: d.bucket, count: d.count, total: d.amount }));
    const page = Math.floor(skip / take) + 1;

    const result = {
      transactions: transactionList,
      dailySummary,
      pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) },
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('items-summary')
  @ApiOperation({ summary: 'Aggregated item sales summary' })
  async itemsSummary(@CurrentUser() user: AuthUser, @Query() query: ReportSearchQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { startDate, endDate, search } = query;

    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:invoices:items:${outletId}:${startDate}:${endDate}:${search}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Grouped by product + variant in SQL (F1005)
    const scope = { outletIds: [outletId], start, end };
    const [rows, totals] = await Promise.all([
      this.queries.itemSales(scope, { search, byVariant: true, limit: MAX_ITEM_ROWS }),
      this.queries.itemTotals(scope, search),
    ]);

    const items = rows.map((item) => ({
      productId: item.productId || 'unknown',
      productName: item.productName,
      variantName: item.variantName || null,
      totalQuantity: item.quantity,
      totalRevenue: item.revenue,
      averagePrice: item.quantity > 0 ? item.revenue / item.quantity : 0,
      transactionCount: item.transactionCount,
    }));

    const summary = {
      totalItems: items.length,
      totalQuantity: totals.quantity,
      totalRevenue: totals.revenue,
    };

    const result = { items, summary };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
