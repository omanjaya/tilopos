import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { money, sumMoney, toNumber } from '@shared/utils/money';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class PaymentReportsController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Get('payment-methods')
  @ApiOperation({ summary: 'Payment method breakdown report' })
  async paymentMethodReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `report:payment-methods:${outletId}:${dateRange}:${startDate}:${endDate}`;
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

    // Aggregated in SQL (F0981); count = payment rows per method,
    // totalTransactions = distinct sales (split payments no longer inflate it, F0982)
    const [grouped, totalTransactions] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { transaction: saleWhere },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.count({ where: { ...saleWhere, payments: { some: {} } } }),
    ]);

    const totalAmountDec = sumMoney(grouped.map((g) => g._sum.amount));
    const totalAmount = toNumber(totalAmountDec);

    const methods = grouped
      .map((g) => {
        const amount = toNumber(money(g._sum.amount));
        return {
          method: g.paymentMethod as string,
          count: g._count._all,
          amount: Math.round(amount * 100) / 100,
          percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100 * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const result = {
      methods,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalTransactions,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }
}
