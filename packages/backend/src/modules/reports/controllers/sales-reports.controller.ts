import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
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
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validation: outletId is required
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    // Validation: outlet must exist
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${outletId} not found`);
    }

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Check cache
    const cacheKey = `report:sales:${outletId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for sales report: ${cacheKey}`);
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
    this.logger.debug(`Cached sales report: ${cacheKey}`);

    return result;
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
}
