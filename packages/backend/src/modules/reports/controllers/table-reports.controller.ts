import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class TableReportsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('table')
    @ApiOperation({
        summary: 'Table performance report (occupancy, turnover, peak hours)',
    })
    async tableReport(
        @Query('outletId') outletId: string,
        @Query('dateRange') dateRange?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
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

        // Assume average 2 guests per table for orders (simple estimation)
        const totalGuests = ordersWithTable.length * 2;
        const avgGuestsPerTable = completedOrders.length > 0 ? 2 : 0;

        // Turnover rate (sessions per table per day)
        const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const turnoverRate =
            tables.length > 0
                ? +(ordersWithTable.length / tables.length / totalDays).toFixed(1)
                : 0;

        // Calculate occupancy based on operating hours (assume 10 hours/day)
        const operatingHoursPerDay = 10;
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
            const hour = order.createdAt.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }

        const peakDiningHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({
                hour: `${hour.padStart(2, '0')}:00`,
                occupancy:
                    tables.length > 0 ? Math.round((count / (tables.length * totalDays)) * 100) : 0,
            }))
            .sort((a, b) => b.occupancy - a.occupancy)
            .slice(0, 8);

        return {
            totalTables: tables.length,
            avgOccupancy: Math.min(100, avgOccupancy), // Cap at 100%
            avgDiningTime,
            turnoverRate,
            totalGuests,
            avgGuestsPerTable,
            tablePerformance,
            peakDiningHours,
        };
    }
}
