import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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

@ApiTags('Reports - Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports/invoices')
export class InvoiceReportsController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async validateOutletAccess(outletId: string, user: AuthUser) {
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
    return outlet;
  }

  @Get()
  @ApiOperation({ summary: 'Invoice list with summary' })
  async invoiceList(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    await this.validateOutletAccess(outletId, user);

    const { start, end } = getDateRange(undefined, startDate, endDate);
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50));
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
      ...(status && status !== 'all' ? { status: status as 'completed' | 'voided' | 'refunded' } : {}),
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
  async transactionsSummary(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    await this.validateOutletAccess(outletId, user);

    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:invoices:transactions:${outletId}:${startDate}:${endDate}:${search}`;
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
            OR: [
              { receiptNumber: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const transactions = await this.prisma.transaction.findMany({
      where: baseWhere,
      include: {
        employee: { select: { name: true } },
        customer: { select: { name: true } },
        payments: { select: { paymentMethod: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

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

    // Group by date for daily summary
    const dailyMap = new Map<string, { count: number; total: number }>();
    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += tx.grandTotal?.toNumber() || 0;
      dailyMap.set(date, existing);
    }

    const dailySummary = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, count: data.count, total: data.total }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const result = { transactions: transactionList, dailySummary };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Get('items-summary')
  @ApiOperation({ summary: 'Aggregated item sales summary' })
  async itemsSummary(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    await this.validateOutletAccess(outletId, user);

    const { start, end } = getDateRange(undefined, startDate, endDate);

    const cacheKey = `report:invoices:items:${outletId}:${startDate}:${endDate}:${search}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const itemWhere = {
      transaction: {
        outletId,
        transactionType: 'sale' as const,
        status: 'completed' as const,
        createdAt: { gte: start, lte: end },
      },
      ...(search ? { productName: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const transactionItems = await this.prisma.transactionItem.findMany({
      where: itemWhere,
      select: {
        productId: true,
        productName: true,
        variantName: true,
        quantity: true,
        subtotal: true,
        transactionId: true,
      },
    });

    // Group by productId + variantName
    const itemMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        variantName: string | null;
        totalQuantity: number;
        totalRevenue: number;
        transactionIds: Set<string>;
      }
    >();

    for (const item of transactionItems) {
      const productId = item.productId || 'unknown';
      const key = `${productId}:${item.variantName || ''}`;
      const existing = itemMap.get(key) || {
        productId,
        productName: item.productName,
        variantName: item.variantName || null,
        totalQuantity: 0,
        totalRevenue: 0,
        transactionIds: new Set<string>(),
      };
      existing.totalQuantity += Number(item.quantity) || 0;
      existing.totalRevenue += item.subtotal?.toNumber() || 0;
      existing.transactionIds.add(item.transactionId);
      itemMap.set(key, existing);
    }

    const items = Array.from(itemMap.values())
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
        averagePrice: item.totalQuantity > 0 ? item.totalRevenue / item.totalQuantity : 0,
        transactionCount: item.transactionIds.size,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const summary = {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.totalQuantity, 0),
      totalRevenue: items.reduce((sum, i) => sum + i.totalRevenue, 0),
    };

    const result = { items, summary };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
