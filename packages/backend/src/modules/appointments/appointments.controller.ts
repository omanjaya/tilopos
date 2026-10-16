import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentDateQueryDto,
  AppointmentRangeQueryDto,
  AvailabilityQueryDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './appointments.dto';

/** Front-of-house staff book and update appointments (frontend /app/appointments). */
const FRONT_OF_HOUSE = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
];
const SUPERVISION = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR];

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('outlet/:outletId')
  async listByDate(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: AppointmentDateQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.listByDate(outletId, user.businessId, query.date);
  }

  @Get('employee/:employeeId')
  async listByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: AppointmentRangeQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.listByEmployee(
      employeeId,
      user.businessId,
      query.startDate,
      query.endDate,
    );
  }

  @Get('customer/:customerId')
  async listByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.listByCustomer(customerId, user.businessId);
  }

  @Get('upcoming/:outletId')
  async getUpcoming(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.getUpcoming(outletId, user.businessId);
  }

  @Get('availability')
  async checkAvailability(@Query() query: AvailabilityQueryDto, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.checkAvailability(
      user.businessId,
      query.outletId,
      query.employeeId,
      query.startTime,
      query.durationMinutes,
      query.excludeId,
    );
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.findById(id, user.businessId);
  }

  @Post()
  @Roles(...FRONT_OF_HOUSE)
  async create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.create(user.businessId, dto);
  }

  @Put(':id')
  @Roles(...FRONT_OF_HOUSE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.update(id, user.businessId, dto);
  }

  @Put(':id/status')
  @Roles(...FRONT_OF_HOUSE)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (
      dto.status === AppointmentStatus.cancelled &&
      !SUPERVISION.includes(user.role as EmployeeRole)
    ) {
      throw new ForbiddenException('Only supervisors and above can cancel appointments');
    }
    return this.appointmentsService.updateStatus(id, user.businessId, dto.status);
  }

  @Put(':id/cancel')
  @Roles(...SUPERVISION)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentsService.cancel(id, user.businessId, dto.reason);
  }
}
