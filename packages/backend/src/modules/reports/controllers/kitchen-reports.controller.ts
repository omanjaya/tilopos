import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class KitchenReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('kitchen')
  @ApiOperation({
    summary: 'Kitchen performance report (avg prep time, orders/hour, peak hours, SLA)',
  })
  async kitchenReport(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('slaTargetMinutes') slaTargetMinutes?: string,
  ) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const { start, end } = getDateRange(dateRange, startDate, endDate);
    const slaTarget = slaTargetMinutes ? parseInt(slaTargetMinutes, 10) : 15;

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
      const hour = order.createdAt.getHours();
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
        fastestPrepMinutes: prepTimes.length > 0 ? Math.round(Math.min(...prepTimes) * 10) / 10 : 0,
        slowestPrepMinutes: prepTimes.length > 0 ? Math.round(Math.max(...prepTimes) * 10) / 10 : 0,
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
