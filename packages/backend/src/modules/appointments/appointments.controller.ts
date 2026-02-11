import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('outlet/:outletId')
  async listByDate(
    @Param('outletId') outletId: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.listByDate(outletId, user.businessId, date);
  }

  @Get('employee/:employeeId')
  async listByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.listByEmployee(employeeId, user.businessId, startDate, endDate);
  }

  @Get('customer/:customerId')
  async listByCustomer(@Param('customerId') customerId: string, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.listByCustomer(customerId, user.businessId);
  }

  @Get('upcoming/:outletId')
  async getUpcoming(@Param('outletId') outletId: string, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.getUpcoming(outletId, user.businessId);
  }

  @Get('availability')
  async checkAvailability(
    @Query('outletId') outletId: string,
    @Query('employeeId') employeeId: string,
    @Query('startTime') startTime: string,
    @Query('durationMinutes') durationMinutes: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.appointmentsService.checkAvailability(
      outletId,
      employeeId,
      startTime,
      parseInt(durationMinutes, 10),
      excludeId,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.findById(id, user.businessId);
  }

  @Post()
  async create(
    @Body()
    dto: {
      outletId: string;
      customerId?: string;
      employeeId?: string;
      serviceName: string;
      servicePrice: number;
      startTime: string;
      durationMinutes: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.create(user.businessId, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      outletId?: string;
      customerId?: string;
      employeeId?: string;
      serviceName?: string;
      servicePrice?: number;
      startTime?: string;
      durationMinutes?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.update(id, user.businessId, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: AppointmentStatus },
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.updateStatus(id, user.businessId, dto.status);
  }

  @Put(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.cancel(id, user.businessId, dto.reason);
  }
}
