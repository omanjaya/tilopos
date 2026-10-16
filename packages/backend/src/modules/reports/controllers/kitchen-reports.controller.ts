import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { KitchenReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { businessHour } from '@shared/utils/business-time';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class KitchenReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Get('kitchen')
  @ApiOperation({
    summary: 'Kitchen performance report (avg prep time, orders/hour, peak hours, SLA)',
  })
  async kitchenReport(@CurrentUser() user: AuthUser, @Query() query: KitchenReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

    const { start, end } = getDateRange(dateRange, startDate, endDate);
    const slaTarget = query.slaTargetMinutes ?? 15;

    // All orders in range (both completed and not)
    const allOrders = await this.prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        items: {
          select: {
            productId: true,
            productName: true,
            station: true,
            status: true,
            startedAt: true,
            completedAt: true,
            quantity: true,
          },
        },
      },
    });

    const completedOrders = allOrders.filter((o) => o.completedAt !== null);

    // Calculate average preparation time (from creation to completion)
    const prepTimes: number[] = [];
    let slaCompliant = 0;
    for (const order of completedOrders) {
      if (order.completedAt && order.createdAt) {
        const diffMs = order.completedAt.getTime() - order.createdAt.getTime();
        const minutes = diffMs / 60000;
        prepTimes.push(minutes);
        if (minutes <= slaTarget) {
          slaCompliant++;
        }
      }
    }

    const avgPrepTime =
      prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : 0;

    const slaAdherenceRate =
      completedOrders.length > 0
        ? Math.round((slaCompliant / completedOrders.length) * 100 * 10) / 10
        : 0;

    // Orders per hour calculation
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const ordersPerHour =
      totalHours > 0 ? Math.round((allOrders.length / totalHours) * 10) / 10 : 0;

    // Peak hours analysis (group by hour of day)
    const hourCounts: Record<number, number> = {};
    for (const order of allOrders) {
      const hour = businessHour(order.createdAt); // WIB (R14)
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour, 10),
        orderCount: count,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    // Items prepared count per product
    const productStats: Record<string, { productName: string; totalPrepared: number }> = {};
    for (const order of allOrders) {
      for (const item of order.items) {
        if (item.status === 'served' || item.status === 'ready' || order.completedAt) {
          const key = item.productId || item.productName;
          if (!productStats[key]) {
            productStats[key] = { productName: item.productName, totalPrepared: 0 };
          }
          productStats[key].totalPrepared += item.quantity;
        }
      }
    }

    const itemsPreparedByProduct = Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        productName: stats.productName,
        totalPrepared: stats.totalPrepared,
      }))
      .sort((a, b) => b.totalPrepared - a.totalPrepared);

    // Items by station
    const stationStats: Record<
      string,
      { itemCount: number; totalQuantity: number; prepTimes: number[] }
    > = {};

    for (const order of allOrders) {
      for (const item of order.items) {
        const station = item.station || 'unassigned';
        if (!stationStats[station]) {
          stationStats[station] = { itemCount: 0, totalQuantity: 0, prepTimes: [] };
        }
        stationStats[station].itemCount += 1;
        stationStats[station].totalQuantity += item.quantity;

        if (item.completedAt && item.startedAt) {
          const diffMs = item.completedAt.getTime() - item.startedAt.getTime();
          stationStats[station].prepTimes.push(diffMs / 60000);
        }
      }
    }

    const stations = Object.entries(stationStats).map(([station, stats]) => ({
      station,
      itemCount: stats.itemCount,
      totalQuantity: stats.totalQuantity,
      avgPrepMinutes:
        stats.prepTimes.length > 0
          ? Math.round((stats.prepTimes.reduce((a, b) => a + b, 0) / stats.prepTimes.length) * 10) /
            10
          : 0,
    }));

    // Order status breakdown
    const statusCounts = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        outletId,
        createdAt: { gte: start, lte: end },
      },
      _count: true,
    });

    return {
      period: { start, end },
      summary: {
        totalOrders: allOrders.length,
        completedOrders: completedOrders.length,
        avgPrepTimeMinutes: Math.round(avgPrepTime * 10) / 10,
        // reduce instead of Math.min(...spread): no RangeError on large arrays
        fastestPrepMinutes:
          prepTimes.length > 0
            ? Math.round(prepTimes.reduce((a, b) => Math.min(a, b), Infinity) * 10) / 10
            : 0,
        slowestPrepMinutes:
          prepTimes.length > 0
            ? Math.round(prepTimes.reduce((a, b) => Math.max(a, b), -Infinity) * 10) / 10
            : 0,
        ordersPerHour,
        slaTargetMinutes: slaTarget,
        slaAdherenceRate,
      },
      peakHours,
      itemsPreparedByProduct,
      stations,
      orderStatusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }
}
