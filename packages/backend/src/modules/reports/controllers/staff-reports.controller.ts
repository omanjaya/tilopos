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
export class StaffReportsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('staff')
    @ApiOperation({
        summary: 'Staff performance report (services, revenue, commission)',
    })
    async staffReport(
        @Query('outletId') outletId: string,
        @Query('dateRange') dateRange?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('commissionRate') commissionRateParam?: string,
    ) {
        const { start, end } = getDateRange(dateRange, startDate, endDate);
        const defaultCommissionRate = commissionRateParam ? parseFloat(commissionRateParam) : 10;

        // Get all active employees for this outlet (any role that provides service)
        const employees = await this.prisma.employee.findMany({
            where: {
                outletId,
                isActive: true,
            },
            select: { id: true, name: true, role: true },
        });

        // Get all completed appointments by staff in date range
        const appointments = await this.prisma.appointment.findMany({
            where: {
                outletId,
                startTime: { gte: start, lte: end },
                status: 'completed',
            },
            select: {
                id: true,
                employeeId: true,
                serviceName: true,
                servicePrice: true,
                startTime: true,
                endTime: true,
                durationMinutes: true,
            },
        });

        // Calculate staff performance
        const staffStats: Record<
            string,
            {
                services: number;
                revenue: number;
                commission: number;
                totalTime: number;
            }
        > = {};

        for (const appt of appointments) {
            const empId = appt.employeeId;
            if (!empId) continue;

            if (!staffStats[empId]) {
                staffStats[empId] = { services: 0, revenue: 0, commission: 0, totalTime: 0 };
            }

            staffStats[empId].services += 1;
            staffStats[empId].revenue += Number(appt.servicePrice || 0);

            // Calculate commission using default rate
            staffStats[empId].commission +=
                Number(appt.servicePrice || 0) * (defaultCommissionRate / 100);

            // Calculate service time
            staffStats[empId].totalTime += appt.durationMinutes || 0;
        }

        // Build staff performance array (only staff with appointments)
        const staffPerformance = employees
            .filter((emp) => staffStats[emp.id])
            .map((emp) => {
                const stats = staffStats[emp.id];
                return {
                    id: emp.id,
                    name: emp.name,
                    services: stats.services,
                    revenue: Math.round(stats.revenue),
                    rating: 0, // No rating field in schema, default to 0
                    commission: Math.round(stats.commission),
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Service breakdown
        const serviceStats: Record<string, { count: number; totalTime: number }> = {};
        for (const appt of appointments) {
            const serviceName = appt.serviceName || 'Unknown';
            if (!serviceStats[serviceName]) {
                serviceStats[serviceName] = { count: 0, totalTime: 0 };
            }
            serviceStats[serviceName].count += 1;
            serviceStats[serviceName].totalTime += appt.durationMinutes || 0;
        }

        const serviceBreakdown = Object.entries(serviceStats)
            .map(([service, stats]) => ({
                service,
                count: stats.count,
                avgTime: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        // Calculate totals
        const totalServices = appointments.length;
        const totalRevenue = appointments.reduce((sum, a) => sum + Number(a.servicePrice || 0), 0);
        const totalTime = Object.values(staffStats).reduce((sum, s) => sum + s.totalTime, 0);
        const avgServiceTime = totalServices > 0 ? Math.round(totalTime / totalServices) : 0;

        return {
            totalStaff: employees.length,
            totalServices,
            totalRevenue: Math.round(totalRevenue),
            avgServiceTime,
            avgRating: 0, // No rating field in schema
            staffPerformance,
            serviceBreakdown,
        };
    }
}
