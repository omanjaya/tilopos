import {
  Controller,
  Get,
  Query,
  UseGuards,
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

/**
 * Staff Performance Controller
 * Simple staff performance metrics for owners.
 */
@ApiTags('Staff Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
@Controller('owner/staff-performance')
export class StaffPerformanceController {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Staff sales leaderboard' })
  async getLeaderboard(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('outletId') outletId?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `staff:leaderboard:${user.businessId}:${dateRange}:${startDate}:${endDate}:${outletId || 'all'}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get outlets
    const outlets = await this.prisma.outlet.findMany({
      where: {
        businessId: user.businessId,
        ...(outletId ? { id: outletId } : {}),
      },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // Get all employees
    const employees = await this.prisma.employee.findMany({
      where: {
        businessId: user.businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        outletId: true,
        outlet: {
          select: {
            name: true,
          },
        },
      },
    });

    const staffPerformance = [];

    for (const employee of employees) {
      // Get sales data
      const salesData = await this.prisma.transaction.aggregate({
        where: {
          outletId: { in: outletIds },
          employeeId: employee.id,
          transactionType: 'sale',
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          grandTotal: true,
        },
        _count: true,
      });

      const totalSales = salesData._sum.grandTotal?.toNumber() || 0;
      const transactionCount = salesData._count;
      const avgTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;

      // Only include staff with sales
      if (totalSales > 0) {
        staffPerformance.push({
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          outletName: employee.outlet?.name || 'N/A',
          totalSales,
          transactionCount,
          avgTransactionValue,
        });
      }
    }

    // Sort by total sales descending
    staffPerformance.sort((a, b) => b.totalSales - a.totalSales);

    // Add rank
    const leaderboard = staffPerformance.map((staff, index) => ({
      ...staff,
      rank: index + 1,
    }));

    const result = {
      leaderboard,
      totalStaff: leaderboard.length,
      topPerformer: leaderboard[0] || null,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  @Get('summary')
  @ApiOperation({ summary: 'Staff performance summary stats' })
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: user.businessId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    // Total active employees
    const totalStaff = await this.prisma.employee.count({
      where: {
        businessId: user.businessId,
        isActive: true,
      },
    });

    // Staff with sales in period
    const staffWithSales = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
        employeeId: { not: null },
      },
      _sum: {
        grandTotal: true,
      },
      _count: true,
    });

    const activeStaffCount = staffWithSales.length;
    const totalSales = staffWithSales.reduce(
      (sum, s) => sum + (s._sum.grandTotal?.toNumber() || 0),
      0,
    );
    const avgSalesPerStaff = activeStaffCount > 0 ? totalSales / activeStaffCount : 0;

    return {
      totalStaff,
      activeStaffCount,
      totalSales,
      avgSalesPerStaff,
    };
  }
}
