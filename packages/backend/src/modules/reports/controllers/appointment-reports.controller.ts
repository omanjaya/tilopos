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
export class AppointmentReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('appointment')
  @ApiOperation({
    summary: 'Appointment/booking report (bookings, conversion, revenue)',
  })
  async appointmentReport(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    const { start, end } = getDateRange(dateRange, startDate, endDate);

    // Get all appointments in date range
    const appointments = await this.prisma.appointment.findMany({
      where: {
        outletId,
        startTime: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        servicePrice: true,
        serviceName: true,
      },
    });

    // Status counts
    const totalBookings = appointments.length;
    const completedBookings = appointments.filter((a) => a.status === 'completed').length;
    const cancelledBookings = appointments.filter((a) => a.status === 'cancelled').length;
    const noShowBookings = appointments.filter((a) => a.status === 'no_show').length;

    // Revenue from completed bookings
    const totalRevenue = appointments
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + Number(a.servicePrice || 0), 0);

    const avgBookingValue =
      completedBookings > 0 ? Math.round(totalRevenue / completedBookings) : 0;

    // Conversion rate (completed / total)
    const conversionRate =
      totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

    // Bookings by day of week
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayCounts: Record<number, number> = {};
    for (const appt of appointments) {
      const dayOfWeek = appt.startTime.getDay();
      dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;
    }

    const bookingsByDay = dayNames.map((day, i) => ({
      day,
      count: dayCounts[i] || 0,
    }));

    // Bookings by source - using status as proxy since no source field
    const bookingsBySource = [{ source: 'Walk-in', count: totalBookings, percentage: 100 }];

    // Popular services
    const serviceCounts: Record<string, number> = {};
    for (const appt of appointments) {
      const serviceName = appt.serviceName || 'Unknown';
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    }

    const popularServices = Object.entries(serviceCounts)
      .map(([name, bookings]) => ({ name, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      totalRevenue: Math.round(totalRevenue),
      avgBookingValue,
      conversionRate,
      bookingsByDay,
      bookingsBySource,
      popularServices,
    };
  }
}
