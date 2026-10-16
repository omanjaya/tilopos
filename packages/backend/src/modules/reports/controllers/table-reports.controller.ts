import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { businessHour } from '@shared/utils/business-time';

/** No operating-hours data per outlet yet; occupancy uses this assumption. */
const ASSUMED_OPERATING_HOURS_PER_DAY = 10;

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class TableReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Get('table')
  @ApiOperation({
    summary: 'Table performance report (occupancy, turnover, peak hours)',
  })
  async tableReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Get all tables for this outlet
    const tables = await this.prisma.table.findMany({
      where: { outletId, isActive: true },
      select: { id: true, name: true, capacity: true },
    });

    // Get all orders with table in date range as proxy for table sessions
    const ordersWithTable = await this.prisma.order.findMany({
      where: {
        outletId,
        tableId: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        tableId: true,
        orderType: true,
        createdAt: true,
        completedAt: true,
        table: { select: { name: true } },
      },
    });

    // Get transactions with tables for revenue
    const transactionsWithTable = await this.prisma.transaction.findMany({
      where: {
        outletId,
        tableId: { not: null },
        createdAt: { gte: start, lte: end },
        transactionType: 'sale',
        status: 'completed',
      },
      select: {
        tableId: true,
        grandTotal: true,
        createdAt: true,
      },
    });

    // Calculate metrics
    const completedOrders = ordersWithTable.filter((o) => o.completedAt !== null);

    // Dining times (in minutes) - from order creation to completion
    const diningTimes: number[] = [];
    for (const order of completedOrders) {
      if (order.completedAt && order.createdAt) {
        const diffMs = order.completedAt.getTime() - order.createdAt.getTime();
        diningTimes.push(diffMs / 60000);
      }
    }

    const avgDiningTime =
      diningTimes.length > 0
        ? Math.round(diningTimes.reduce((a, b) => a + b, 0) / diningTimes.length)
        : 0;

    // Guest counts are not recorded on orders; report them as unknown instead of
    // fabricating "2 guests per order" (R10, F0989)
    const totalGuests: number | null = null;
    const avgGuestsPerTable: number | null = null;

    // Turnover rate (sessions per table per day)
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const turnoverRate =
      tables.length > 0 ? +(ordersWithTable.length / tables.length / totalDays).toFixed(1) : 0;

    // Occupancy is an ESTIMATE: outlets have no operating-hours setting, so a
    // 10h business day is assumed. Flagged in the response (occupancyEstimated).
    const operatingHoursPerDay = ASSUMED_OPERATING_HOURS_PER_DAY;
    const totalTableHours = tables.length * totalDays * operatingHoursPerDay;
    const occupiedHours = diningTimes.reduce((sum, t) => sum + t, 0) / 60;
    const avgOccupancy =
      totalTableHours > 0 ? Math.round((occupiedHours / totalTableHours) * 100) : 0;

    // Table performance breakdown
    const tableStats: Record<
      string,
      { turnover: number; totalTime: number; revenue: number; sessions: number; name: string }
    > = {};

    for (const order of completedOrders) {
      const tableId = order.tableId!;
      if (!tableStats[tableId]) {
        tableStats[tableId] = {
          turnover: 0,
          totalTime: 0,
          revenue: 0,
          sessions: 0,
          name: order.table?.name || 'Unknown',
        };
      }
      tableStats[tableId].turnover += 1;
      tableStats[tableId].sessions += 1;
      if (order.completedAt && order.createdAt) {
        tableStats[tableId].totalTime +=
          (order.completedAt.getTime() - order.createdAt.getTime()) / 60000;
      }
    }

    // Add revenue from transactions
    for (const txn of transactionsWithTable) {
      const tableId = txn.tableId!;
      if (tableStats[tableId]) {
        tableStats[tableId].revenue += Number(txn.grandTotal);
      }
    }

    const tablePerformance = Object.entries(tableStats)
      .map(([, stats]) => ({
        name: stats.name,
        turnover: stats.turnover,
        avgTime: stats.sessions > 0 ? Math.round(stats.totalTime / stats.sessions) : 0,
        revenue: Math.round(stats.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Peak dining hours
    const hourCounts: Record<number, number> = {};
    for (const order of ordersWithTable) {
      const hour = businessHour(order.createdAt); // WIB (R14)
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const peakDiningHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        occupancy: tables.length > 0 ? Math.round((count / (tables.length * totalDays)) * 100) : 0,
      }))
      .sort((a, b) => b.occupancy - a.occupancy)
      .slice(0, 8);

    return {
      totalTables: tables.length,
      avgOccupancy: Math.min(100, avgOccupancy), // Cap at 100%
      occupancyEstimated: true,
      assumedOperatingHoursPerDay: operatingHoursPerDay,
      avgDiningTime,
      turnoverRate,
      totalGuests,
      avgGuestsPerTable,
      tablePerformance,
      peakDiningHours,
    };
  }
}
