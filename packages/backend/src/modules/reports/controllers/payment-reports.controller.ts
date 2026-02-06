import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class PaymentReportsController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('payment-methods')
  @ApiOperation({ summary: 'Payment method breakdown report' })
  async paymentMethodReport(
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validation
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${outletId} not found`);
    }

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Check cache
    const cacheKey = `report:payment-methods:${outletId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for payment methods report: ${cacheKey}`);
      return cached;
    }

    // Get all payments from completed transactions
    const payments = await this.prisma.payment.findMany({
      where: {
        transaction: {
          outletId,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
      },
      select: {
        paymentMethod: true,
        amount: true,
      },
    });

    // Aggregate by payment method
    const methodStats = new Map<string, { count: number; amount: number }>();

    let totalAmount = 0;
    let totalTransactions = 0;

    for (const payment of payments) {
      const method = payment.paymentMethod;
      const amount = payment.amount.toNumber();
      const existing = methodStats.get(method);

      totalAmount += amount;
      totalTransactions += 1;

      if (existing) {
        existing.count += 1;
        existing.amount += amount;
      } else {
        methodStats.set(method, { count: 1, amount });
      }
    }

    // Convert to array with percentages
    const methods = Array.from(methodStats.entries())
      .map(([method, stats]) => ({
        method,
        count: stats.count,
        amount: Math.round(stats.amount * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((stats.amount / totalAmount) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const result = {
      methods,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalTransactions,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);
    this.logger.debug(`Cached payment methods report: ${cacheKey}`);

    return result;
  }
}
