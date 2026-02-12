import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { StartShiftUseCase } from '../../application/use-cases/employees/start-shift.use-case';
import { EndShiftUseCase } from '../../application/use-cases/employees/end-shift.use-case';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  StartShiftDto,
  EndShiftDto,
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
import type { IEmployeeRepository } from '../../domain/interfaces/repositories/employee.repository';
import type { IShiftRepository } from '../../domain/interfaces/repositories/shift.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EmployeesService } from './employees.service';
import {
  decimalToNumberRequired,
  decimalToNumber,
} from '../../infrastructure/repositories/decimal.helper';
import { OutletAccessGuard } from '../../shared/guards/outlet-access.guard';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly startShiftUseCase: StartShiftUseCase,
    private readonly endShiftUseCase: EndShiftUseCase,
    private readonly employeesService: EmployeesService,
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================================================
  // Employee CRUD
  // ==========================================================================

  @Get()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async listEmployees(@CurrentUser() user: AuthUser, @Query('outletId') outletId?: string) {
    // Owner/super_admin can see all outlets, others only their assigned outlet
    const accessibleOutletId = OutletAccessGuard.getAccessibleOutletId(user, outletId);

    const employees = await this.prisma.employee.findMany({
      where: {
        businessId: user.businessId,
        isActive: true,
        ...OutletAccessGuard.buildOutletFilter(accessibleOutletId),
      },
      include: { outlet: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    return employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      role: e.role,
      outletId: e.outletId,
      outletName: e.outlet?.name ?? '',
      hourlyRate: e.hourlyRate?.toNumber() ?? null,
      isActive: e.isActive,
      businessId: e.businessId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async createEmployee(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    let hashedPin: string | null = null;
    if (dto.pin) {
      hashedPin = await bcrypt.hash(dto.pin, 10);
    }

    return this.employeeRepo.save({
      id: '',
      businessId: user.businessId,
      outletId: dto.outletId || null,
      name: dto.name,
      email: dto.email || null,
      phone: dto.phone || null,
      pin: hashedPin,
      role: dto.role,
      permissions: [],
      hourlyRate: dto.hourlyRate || null,
      isActive: true,
      mfaSecret: null,
      mfaEnabled: false,
      googleId: null,
      authProvider: 'local',
      profilePhotoUrl: null,
      preferences: null,
      onboardingCompleted: false,
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @Get(':id')
  async getEmployee(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const e = await this.prisma.employee.findUnique({
      where: { id },
      include: { outlet: { select: { name: true } } },
    });
    if (!e) throw new NotFoundException('Employee not found');

    // Verify employee belongs to user's business
    if (e.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Enforce outlet access (owner can see all)
    OutletAccessGuard.enforceOutletAccess(user, e.outletId, 'employee');

    return {
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      role: e.role,
      outletId: e.outletId,
      outletName: e.outlet?.name ?? '',
      hourlyRate: e.hourlyRate?.toNumber() ?? null,
      isActive: e.isActive,
      businessId: e.businessId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  @Put(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');

    // Enforce outlet access (owner can update all)
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.outletId !== undefined) updateData.outletId = dto.outletId;
    if (dto.hourlyRate !== undefined) updateData.hourlyRate = dto.hourlyRate;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.pin) {
      updateData.pin = await bcrypt.hash(dto.pin, 10);
    }

    return this.employeeRepo.update(id, updateData);
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async deleteEmployee(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');

    // Enforce outlet access (owner can delete all)
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    await this.employeeRepo.update(id, { isActive: false });
    return { message: 'Employee deactivated' };
  }

  // ==========================================================================
  // Shift Operations (existing - generic routes without employee ID in path)
  // ==========================================================================

  @Post('shifts/start')
  async startShift(@Body() dto: StartShiftDto, @CurrentUser() user: AuthUser) {
    return this.startShiftUseCase.execute({
      outletId: dto.outletId,
      employeeId: user.employeeId,
      openingCash: dto.openingCash,
    });
  }

  @Post('shifts/:shiftId/end')
  async endShift(
    @Param('shiftId') shiftId: string,
    @Body() dto: EndShiftDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.endShiftUseCase.execute({
      shiftId,
      employeeId: user.employeeId,
      closingCash: dto.closingCash,
    });
  }

  @Get('shifts/current')
  async getCurrentShift(@CurrentUser() user: AuthUser) {
    const shift = await this.shiftRepo.findOpenShift(user.employeeId);
    return shift ?? null;
  }

  // ==========================================================================
  // Shift Operations (per-employee routes - frontend calls these)
  // Frontend: GET /employees/:employeeId/shifts
  // Frontend: POST /employees/:employeeId/shifts/start
  // Frontend: POST /employees/:employeeId/shifts/end
  // ==========================================================================

  @Get(':id/shifts')
  @ApiOperation({ summary: 'List shifts for a specific employee' })
  async listEmployeeShifts(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId?: string,
  ) {
    // Verify employee exists and belongs to business
    const employee = await this.employeeRepo.findById(id);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Enforce outlet access
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    // Owner/super_admin can filter by outlet, others see only their outlet's shifts
    const accessibleOutletId = OutletAccessGuard.getAccessibleOutletId(user, outletId);

    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId: id,
        ...OutletAccessGuard.buildOutletFilter(accessibleOutletId),
      },
      include: {
        outlet: { select: { name: true } },
        employee: { select: { name: true } },
        transactions: {
          where: { status: 'completed' },
          select: { grandTotal: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return shifts.map((s) => {
      const openingCash = decimalToNumberRequired(s.openingCash);
      const closingCash = decimalToNumber(s.closingCash);
      const expectedCash = decimalToNumber(s.expectedCash);
      const cashDifference = decimalToNumber(s.cashDifference);
      const totalSales = s.transactions.reduce(
        (sum, tx) => sum + decimalToNumberRequired(tx.grandTotal),
        0,
      );
      const totalTransactions = s.transactions.length;

      return {
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employee.name,
        outletId: s.outletId,
        outletName: s.outlet.name,
        openingCash,
        closingCash,
        expectedCash,
        cashDifference,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        notes: s.notes,
        totalSales,
        totalTransactions,
      };
    });
  }

  @Post(':id/shifts/start')
  @ApiOperation({ summary: 'Start a shift for a specific employee' })
  async startShiftForEmployee(
    @Param('id') employeeId: string,
    @Body() dto: { outletId: string; openingCash: number },
  ) {
    return this.startShiftUseCase.execute({
      outletId: dto.outletId,
      employeeId,
      openingCash: dto.openingCash,
    });
  }

  @Post(':id/shifts/end')
  @ApiOperation({ summary: 'End the current shift for a specific employee' })
  async endShiftForEmployee(
    @Param('id') employeeId: string,
    @Body() dto: { closingCash: number; notes?: string },
  ) {
    // Find the currently open shift for this employee
    const openShift = await this.shiftRepo.findOpenShift(employeeId);
    if (!openShift) throw new NotFoundException('No open shift found for this employee');

    return this.endShiftUseCase.execute({
      shiftId: openShift.id,
      employeeId,
      closingCash: dto.closingCash,
    });
  }

  // ==========================================================================
  // 1. Shift Reports
  // ==========================================================================

  @Get('shifts/summary')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getShiftSummary(@Query() query: ShiftSummaryQueryDto) {
    return this.employeesService.getAllEmployeeShiftSummary(
      query.outletId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get(':id/shifts/report')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getEmployeeShiftReport(
    @Param('id') id: string,
    @Query() query: ShiftReportQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Verify employee exists and belongs to business
    const employee = await this.employeeRepo.findById(id);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Enforce outlet access
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    return this.employeesService.getEmployeeShiftReport(
      id,
      new Date(query.from),
      new Date(query.to),
    );
  }

  // ==========================================================================
  // 2. Schedule Management
  // ==========================================================================

  @Post('schedule')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.employeesService.createSchedule({
      employeeId: dto.employeeId,
      outletId: dto.outletId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      notes: dto.notes,
    });
  }

  @Get('schedule')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getSchedule(@Query() query: ScheduleQueryDto) {
    return this.employeesService.getWeeklySchedule(query.outletId, new Date(query.weekStart));
  }

  @Put('schedule/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.employeesService.updateSchedule(id, {
      employeeId: dto.employeeId,
      outletId: dto.outletId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      notes: dto.notes,
    });
  }

  @Delete('schedule/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async deleteSchedule(@Param('id') id: string) {
    return this.employeesService.deleteSchedule(id);
  }

  // ==========================================================================
  // 3. Commission Calculator
  // ==========================================================================

  @Get('commissions/summary')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getCommissionSummary(@Query() query: CommissionSummaryQueryDto) {
    return this.employeesService.getAllEmployeeCommissionSummary(
      query.outletId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get(':id/commissions')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getEmployeeCommissions(
    @Param('id') id: string,
    @Query() query: CommissionQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Verify employee exists and belongs to business
    const employee = await this.employeeRepo.findById(id);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Enforce outlet access
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    return this.employeesService.getEmployeeCommissions(
      id,
      new Date(query.from),
      new Date(query.to),
    );
  }

  // ==========================================================================
  // 4. Attendance Tracking
  // ==========================================================================

  @Get('attendance/summary')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getAttendanceSummary(@Query() query: AttendanceSummaryQueryDto) {
    return this.employeesService.getAttendanceSummary(
      query.outletId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Post(':id/attendance/clock-in')
  async clockIn(@Param('id') id: string, @Body() dto: ClockInDto) {
    return this.employeesService.clockIn(id, dto.outletId);
  }

  @Post(':id/attendance/clock-out')
  async clockOut(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // Verify employee exists and belongs to business
    const employee = await this.employeeRepo.findById(id);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Enforce outlet access
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    return this.employeesService.clockOut(id);
  }

  @Get(':id/attendance')
  async getAttendanceRecords(
    @Param('id') id: string,
    @Query() query: AttendanceQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Verify employee exists and belongs to business
    const employee = await this.employeeRepo.findById(id);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Enforce outlet access
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    return this.employeesService.getAttendanceRecords(id, new Date(query.from), new Date(query.to));
  }
}
