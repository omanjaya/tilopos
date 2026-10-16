import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles, AllowAnyRole } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { OutletAccessGuard } from '../../shared/guards/outlet-access.guard';
import { StartShiftUseCase } from '../../application/use-cases/employees/start-shift.use-case';
import { EndShiftUseCase } from '../../application/use-cases/employees/end-shift.use-case';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  StartShiftDto,
  EndShiftDto,
  ListEmployeesQueryDto,
  ListEmployeeShiftsQueryDto,
} from '../../application/dtos/employee.dto';
import {
  ShiftReportQueryDto,
  ShiftSummaryQueryDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
  CommissionQueryDto,
  CommissionSummaryQueryDto,
  ClockInDto,
  AttendanceQueryDto,
  AttendanceSummaryQueryDto,
} from '../../application/dtos/employee-features.dto';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IShiftRepository } from '../../domain/interfaces/repositories/shift.repository';
import { EmployeesService } from './employees.service';
import { EmployeeManagementService } from './employee-management.service';
import { resolveReportRange } from './employee-date-range';

const MANAGEMENT = [EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN] as const;
/** Roles that run a cash shift. Acting on another employee additionally needs supervisor+. */
const SHIFT_ROLES = [
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
] as const;

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly startShiftUseCase: StartShiftUseCase,
    private readonly endShiftUseCase: EndShiftUseCase,
    private readonly employeesService: EmployeesService,
    private readonly management: EmployeeManagementService,
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
  ) {}

  /** Non-owners may only touch schedules of their assigned outlet. */
  private scheduleScope(user: AuthUser): string | undefined {
    return OutletAccessGuard.canAccessAllOutlets(user) ? undefined : (user.outletId ?? undefined);
  }

  // ==========================================================================
  // Employee CRUD
  // ==========================================================================

  @Get()
  @Roles(...MANAGEMENT)
  async listEmployees(@CurrentUser() user: AuthUser, @Query() query: ListEmployeesQueryDto) {
    return this.management.list(user, query);
  }

  @Post()
  @Roles(...MANAGEMENT)
  async createEmployee(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.management.create(user, dto);
  }

  // ==========================================================================
  // Static routes MUST come before :id to avoid route conflict
  // ==========================================================================

  @Get('shifts/current')
  async getCurrentShift(@CurrentUser() user: AuthUser) {
    const shift = await this.shiftRepo.findOpenShift(user.employeeId);
    return shift ?? { shift: null };
  }

  @Get('shifts/summary')
  @Roles(...MANAGEMENT)
  async getShiftSummary(@Query() query: ShiftSummaryQueryDto, @CurrentUser() user: AuthUser) {
    await this.management.assertReportOutlet(user, query.outletId);
    const { from, to } = resolveReportRange(query.from, query.to);
    return this.employeesService.getAllEmployeeShiftSummary(query.outletId, from, to);
  }

  @Get('shifts/:shiftId/summary')
  @ApiOperation({ summary: 'Live totals (expected cash, payment breakdown) of a shift' })
  async getLiveShiftSummary(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.management.getShiftSummary(user, shiftId);
  }

  @Get('schedule')
  @Roles(...MANAGEMENT)
  async getSchedule(@Query() query: ScheduleQueryDto, @CurrentUser() user: AuthUser) {
    await this.management.assertReportOutlet(user, query.outletId);
    return this.employeesService.getWeeklySchedule(query.outletId, query.weekStart);
  }

  @Get('commissions/summary')
  @Roles(...MANAGEMENT)
  async getCommissionSummary(
    @Query() query: CommissionSummaryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.management.assertReportOutlet(user, query.outletId);
    const { from, to } = resolveReportRange(query.from, query.to);
    return this.employeesService.getAllEmployeeCommissionSummary(query.outletId, from, to);
  }

  @Get('attendance/summary')
  @Roles(...MANAGEMENT)
  async getAttendanceSummary(
    @Query() query: AttendanceSummaryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.management.assertReportOutlet(user, query.outletId);
    const { from, to } = resolveReportRange(query.from, query.to);
    return this.employeesService.getAttendanceSummary(query.outletId, from, to);
  }

  // ==========================================================================
  // Shift Operations (caller's own shift)
  // ==========================================================================

  @Post('shifts/start')
  @AllowAnyRole()
  async startShift(@Body() dto: StartShiftDto, @CurrentUser() user: AuthUser) {
    await this.management.assertOutletUsable(user, dto.outletId);
    return this.startShiftUseCase.execute({
      outletId: dto.outletId,
      employeeId: user.employeeId,
      businessId: user.businessId,
      openingCash: dto.openingCash,
    });
  }

  @Post('shifts/:shiftId/end')
  @AllowAnyRole()
  async endShift(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: EndShiftDto,
    @CurrentUser() user: AuthUser,
  ) {
    // The use case rejects shifts that are not the caller's own.
    return this.endShiftUseCase.execute({
      shiftId,
      employeeId: user.employeeId,
      businessId: user.businessId,
      closingCash: dto.closingCash,
      notes: dto.notes,
    });
  }

  // ==========================================================================
  // Schedule Management (static prefix, before :id)
  // ==========================================================================

  @Post('schedule')
  @Roles(...MANAGEMENT)
  async createSchedule(@Body() dto: CreateScheduleDto, @CurrentUser() user: AuthUser) {
    await this.management.assertReportOutlet(user, dto.outletId);
    await this.management.loadInBusiness(user, dto.employeeId);
    return this.employeesService.createSchedule(
      {
        employeeId: dto.employeeId,
        outletId: dto.outletId,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        notes: dto.notes,
      },
      user.businessId,
    );
  }

  @Put('schedule/:id')
  @Roles(...MANAGEMENT)
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (dto.employeeId) {
      await this.management.loadInBusiness(user, dto.employeeId);
    }
    if (dto.outletId) {
      await this.management.assertReportOutlet(user, dto.outletId);
    }
    return this.employeesService.updateSchedule(
      id,
      {
        employeeId: dto.employeeId,
        outletId: dto.outletId,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        notes: dto.notes,
      },
      user.businessId,
      this.scheduleScope(user),
    );
  }

  @Delete('schedule/:id')
  @Roles(...MANAGEMENT)
  async deleteSchedule(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.employeesService.deleteSchedule(id, user.businessId, this.scheduleScope(user));
  }

  // ==========================================================================
  // Dynamic :id routes
  // ==========================================================================

  @Get(':id')
  async getEmployee(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.management.get(user, id);
  }

  @Put(':id')
  @Roles(...MANAGEMENT)
  async updateEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.management.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...MANAGEMENT)
  async deleteEmployee(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.management.deactivate(user, id);
  }

  // ==========================================================================
  // Shift Operations (per-employee routes)
  // Self, or supervisor+ acting on a lower role in their own outlet.
  // ==========================================================================

  @Get(':id/shifts')
  @ApiOperation({ summary: 'List shifts for a specific employee (self or manager+)' })
  async listEmployeeShifts(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListEmployeeShiftsQueryDto,
  ) {
    return this.management.listShifts(user, id, query);
  }

  @Post(':id/shifts/start')
  @Roles(...SHIFT_ROLES)
  @ApiOperation({ summary: 'Start a shift for a specific employee' })
  async startShiftForEmployee(
    @Param('id', ParseUUIDPipe) employeeId: string,
    @Body() dto: StartShiftDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.management.loadInBusiness(user, employeeId);
    this.management.assertCanActOn(user, employee);
    await this.management.assertOutletUsable(user, dto.outletId);
    return this.startShiftUseCase.execute({
      outletId: dto.outletId,
      employeeId,
      businessId: user.businessId,
      openingCash: dto.openingCash,
    });
  }

  @Post(':id/shifts/end')
  @Roles(...SHIFT_ROLES)
  @ApiOperation({ summary: 'End the current shift for a specific employee' })
  async endShiftForEmployee(
    @Param('id', ParseUUIDPipe) employeeId: string,
    @Body() dto: EndShiftDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.management.loadInBusiness(user, employeeId);
    this.management.assertCanActOn(user, employee);

    const openShift = await this.shiftRepo.findOpenShift(employeeId);
    if (!openShift) throw new NotFoundException('No open shift found for this employee');
    OutletAccessGuard.enforceOutletAccess(user, openShift.outletId, 'shift');

    const result = await this.endShiftUseCase.execute({
      shiftId: openShift.id,
      employeeId,
      businessId: user.businessId,
      closingCash: dto.closingCash,
      notes: dto.notes,
    });
    this.management.auditShiftEndOnBehalf(user, employee, openShift.id, dto.closingCash);
    return result;
  }

  // ==========================================================================
  // 1. Shift Reports
  // ==========================================================================

  @Get(':id/shifts/report')
  @Roles(...MANAGEMENT)
  async getEmployeeShiftReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ShiftReportQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.management.loadInBusiness(user, id);
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');
    const { from, to } = resolveReportRange(query.from, query.to);
    return this.employeesService.getEmployeeShiftReport(id, from, to);
  }

  // ==========================================================================
  // 3. Commission Calculator
  // ==========================================================================

  @Get(':id/commissions')
  @Roles(...MANAGEMENT)
  async getEmployeeCommissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CommissionQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.management.loadInBusiness(user, id);
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');
    const { from, to } = resolveReportRange(query.from, query.to);
    return this.employeesService.getEmployeeCommissions(id, from, to);
  }

  // ==========================================================================
  // 4. Attendance Tracking (self, or supervisor+ within their outlet)
  // ==========================================================================

  @Post(':id/attendance/clock-in')
  @AllowAnyRole()
  async clockIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClockInDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.management.loadInBusiness(user, id);
    this.management.assertCanActOn(user, employee);
    await this.management.assertOutletUsable(user, dto.outletId);
    return this.employeesService.clockIn(id, dto.outletId, user.businessId);
  }

  @Post(':id/attendance/clock-out')
  @AllowAnyRole()
  async clockOut(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const employee = await this.management.loadInBusiness(user, id);
    this.management.assertCanActOn(user, employee);
    return this.employeesService.clockOut(id);
  }

  @Get(':id/attendance')
  async getAttendanceRecords(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AttendanceQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.management.loadInBusiness(user, id);
    this.management.assertCanActOn(user, employee, EmployeeRole.MANAGER);
    const { from, to } = resolveReportRange(query.from, query.to);
    return this.employeesService.getAttendanceRecords(id, from, to);
  }
}
