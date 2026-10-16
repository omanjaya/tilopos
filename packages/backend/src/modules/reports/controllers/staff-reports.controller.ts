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

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class StaffReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Get('staff')
  @ApiOperation({
    summary: 'Staff performance report (services, revenue, commission)',
  })
  async staffReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);

    const { start, end } = getDateRange(dateRange, startDate, endDate);
    // Active staff assigned to this outlet (for the headcount)
    const totalStaff = await this.prisma.employee.count({
      where: { businessId: user.businessId, outletId, isActive: true },
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

    // Performance is based on whoever served the appointments (also owners/managers
    // without an outlet assignment, F0995), scoped to the caller's business
    const servingIds = [
      ...new Set(appointments.map((a) => a.employeeId).filter((id): id is string => !!id)),
    ];
    const employees =
      servingIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: servingIds }, businessId: user.businessId },
            select: { id: true, name: true, role: true },
          })
        : [];

    // Calculate staff performance
    const staffStats: Record<
      string,
      {
        services: number;
        revenue: number;
        totalTime: number;
      }
    > = {};

    for (const appt of appointments) {
      const empId = appt.employeeId;
      if (!empId) continue;

      if (!staffStats[empId]) {
        staffStats[empId] = { services: 0, revenue: 0, totalTime: 0 };
      }

      staffStats[empId].services += 1;
      staffStats[empId].revenue += Number(appt.servicePrice || 0);

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
          // No rating data and no commission configuration exist: report as
          // unknown instead of fake numbers (R10, F0993)
          rating: null,
          commission: null,
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
      totalStaff,
      totalServices,
      totalRevenue: Math.round(totalRevenue),
      avgServiceTime,
      avgRating: null,
      staffPerformance,
      serviceBreakdown,
    };
  }
}
