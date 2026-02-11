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

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class FinancialReportsController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('financial')
  @ApiOperation({ summary: 'Financial report (revenue, cost, profit, margin)' })
  async financialReport(
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

    const totalRevenue =
      (sales._sum.grandTotal?.toNumber() || 0) - Math.abs(refunds._sum.grandTotal?.toNumber() || 0);
    const totalCost = items.reduce(
      (sum, item) => sum + (item.product?.costPrice?.toNumber() || 0) * item.quantity.toNumber(),
      0,
    );
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const result = {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }
}
