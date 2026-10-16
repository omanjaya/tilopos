import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';

/**
 * Staff Performance Controller
 * Simple staff performance metrics for owners.
 */
@ApiTags('Staff Performance')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
@Controller('owner/staff-performance')
export class StaffPerformanceController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Staff sales leaderboard' })
  async getLeaderboard(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate, outletId } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `staff:leaderboard:${user.businessId}:${dateRange}:${startDate}:${endDate}:${outletId || 'all'}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Requested outlet must belong to the caller's business (R3)
    const outletIds = await this.tenant.resolveOutletIds(user, outletId);

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

    // Single groupBy query instead of N+1 per-employee queries
    const salesByEmployee = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        outletId: { in: outletIds },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
        employeeId: { not: null },
      },
      _sum: { grandTotal: true },
      _count: true,
    });

    // Build a lookup map from employeeId -> sales data
    const salesMap = new Map<string, { totalSales: number; transactionCount: number }>();
    for (const entry of salesByEmployee) {
      if (entry.employeeId) {
        salesMap.set(entry.employeeId, {
          totalSales: entry._sum.grandTotal?.toNumber() || 0,
          transactionCount: entry._count,
        });
      }
    }

    // Merge employee data with sales data
    const staffPerformance = [];
    for (const employee of employees) {
      const sales = salesMap.get(employee.id);
      if (sales && sales.totalSales > 0) {
        staffPerformance.push({
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          outletName: employee.outlet?.name || 'N/A',
          totalSales: sales.totalSales,
          transactionCount: sales.transactionCount,
          avgTransactionValue:
            sales.transactionCount > 0 ? sales.totalSales / sales.transactionCount : 0,
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
  async getSummary(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const outletIds = await this.tenant.resolveOutletIds(user);

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
