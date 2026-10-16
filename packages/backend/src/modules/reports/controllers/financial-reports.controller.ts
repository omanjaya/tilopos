import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { money } from '@shared/utils/money';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';
import { computeProfit } from '../utils/profit.util';

@ApiTags('Reports')
@ApiBearerAuth()
// Cost/profit data: manager and above only (R12, F0968)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@Controller('reports')
export class FinancialReportsController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  @Get('financial')
  @ApiOperation({ summary: 'Financial report (revenue, cost, profit, margin)' })
  async financialReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `report:financial:${outletId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const whereClause = {
      outletId,
      status: 'completed' as const,
      createdAt: { gte: start, lte: end },
    };

    const [sales, refunds, totalCost] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...whereClause, transactionType: 'sale' },
        _sum: { subtotal: true, discountAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...whereClause, transactionType: 'refund' },
        _sum: { subtotal: true },
      }),
      // COGS aggregated in SQL (R13)
      this.queries.cogs({ outletIds: [outletId], start, end }),
    ]);

    // Revenue = net sales excl. tax, net of refunds; profit = revenue - COGS
    const profit = computeProfit({
      grossSales: sales._sum.subtotal,
      discounts: sales._sum.discountAmount,
      refunds: money(refunds._sum.subtotal).abs(),
      cogs: totalCost,
    });

    const result = {
      totalRevenue: profit.netRevenue,
      totalCost: profit.expenses,
      grossProfit: profit.netProfit,
      grossMargin: profit.profitMargin,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }
}
