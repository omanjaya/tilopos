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
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole, canManageRole } from '../../shared/constants/roles';
import { EmployeeRole as PrismaEmployeeRole } from '@prisma/client';
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
import { LogAuditEventUseCase } from '../../application/use-cases/audit/log-audit-event.use-case';
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
  private readonly logger = new Logger(EmployeesController.name);

  constructor(
    private readonly startShiftUseCase: StartShiftUseCase,
    private readonly endShiftUseCase: EndShiftUseCase,
    private readonly employeesService: EmployeesService,
    private readonly logAuditEventUseCase: LogAuditEventUseCase,
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyOutletAccess(outletId: string, user: AuthUser): Promise<void> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet || outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }
  }

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
    if (!canManageRole(user.role, dto.role)) {
      throw new ForbiddenException('You cannot assign a role equal to or higher than your own');
    }

    let hashedPin: string | null = null;
    if (dto.pin) {
      hashedPin = await bcrypt.hash(dto.pin, 10);
    }

    const created = await this.prisma.employee.create({
      data: {
        businessId: user.businessId,
        outletId: dto.outletId ?? null,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        pin: hashedPin,
        role: dto.role as PrismaEmployeeRole,
        permissions: [],
        hourlyRate: dto.hourlyRate ?? null,
        isActive: true,
        mfaSecret: null,
        mfaEnabled: false,
        googleId: null,
        authProvider: 'local',
      },
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      role: created.role,
      outletId: created.outletId,
      hourlyRate: created.hourlyRate?.toNumber() ?? null,
      isActive: created.isActive,
      businessId: created.businessId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
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
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getShiftSummary(@Query() query: ShiftSummaryQueryDto, @CurrentUser() user: AuthUser) {
    await this.verifyOutletAccess(query.outletId, user);
    return this.employeesService.getAllEmployeeShiftSummary(
      query.outletId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('schedule')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getSchedule(@Query() query: ScheduleQueryDto, @CurrentUser() user: AuthUser) {
    await this.verifyOutletAccess(query.outletId, user);
    return this.employeesService.getWeeklySchedule(query.outletId, new Date(query.weekStart));
  }

  @Get('commissions/summary')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getCommissionSummary(
    @Query() query: CommissionSummaryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyOutletAccess(query.outletId, user);
    return this.employeesService.getAllEmployeeCommissionSummary(
      query.outletId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('attendance/summary')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async getAttendanceSummary(
    @Query() query: AttendanceSummaryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyOutletAccess(query.outletId, user);
    return this.employeesService.getAttendanceSummary(
      query.outletId,
      new Date(query.from),
      new Date(query.to),
    );
  }

  // ==========================================================================
  // Dynamic :id routes
  // ==========================================================================

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
    if (employee.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied');
    }

    // Enforce outlet access (owner can update all)
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    // Validate role hierarchy: requester must outrank the target employee's current role
    if (!canManageRole(user.role, employee.role)) {
      throw new ForbiddenException(
        'You cannot modify an employee with a role equal to or higher than your own',
      );
    }

    // If changing role, validate requester outranks the new role as well
    if (dto.role !== undefined && !canManageRole(user.role, dto.role)) {
      throw new ForbiddenException('You cannot assign a role equal to or higher than your own');
    }

    // Capture old role before update for audit logging
    const oldRole = employee.role;

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

    const result = await this.employeeRepo.update(id, updateData);

    // Audit log when role changes
    if (dto.role !== undefined && dto.role !== oldRole) {
      this.logger.log(
        `Role changed: employee=${id} from=${oldRole} to=${dto.role} by=${user.employeeId}`,
      );
      this.logAuditEventUseCase
        .execute({
          businessId: user.businessId,
          outletId: employee.outletId || undefined,
          employeeId: user.employeeId,
          action: 'CHANGE_ROLE',
          entityType: 'employee',
          entityId: id,
          oldValue: { role: oldRole },
          newValue: { role: dto.role },
        })
        .catch(() => {
          /* ignore audit log failures */
        });
    }

    return result;
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async deleteEmployee(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied');
    }

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
      notes: dto.notes,
    });
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
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Start a shift for a specific employee' })
  async startShiftForEmployee(
    @Param('id') employeeId: string,
    @Body() dto: { outletId: string; openingCash: number },
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }
    return this.startShiftUseCase.execute({
      outletId: dto.outletId,
      employeeId,
      openingCash: dto.openingCash,
    });
  }

  @Post(':id/shifts/end')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.CASHIER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'End the current shift for a specific employee' })
  async endShiftForEmployee(
    @Param('id') employeeId: string,
    @Body() dto: { closingCash: number; notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }

    // Find the currently open shift for this employee
    const openShift = await this.shiftRepo.findOpenShift(employeeId);
    if (!openShift) throw new NotFoundException('No open shift found for this employee');

    return this.endShiftUseCase.execute({
      shiftId: openShift.id,
      employeeId,
      closingCash: dto.closingCash,
      notes: dto.notes,
    });
  }

  // ==========================================================================
  // 1. Shift Reports
  // ==========================================================================

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
  async createSchedule(@Body() dto: CreateScheduleDto, @CurrentUser() user: AuthUser) {
    // Verify employee and outlet belong to user's business
    await this.validateScheduleAccess(user.businessId, dto.employeeId, dto.outletId);
    return this.employeesService.createSchedule({
      employeeId: dto.employeeId,
      outletId: dto.outletId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      notes: dto.notes,
    });
  }

  @Put('schedule/:id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN)
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (dto.employeeId || dto.outletId) {
      await this.validateScheduleAccess(user.businessId, dto.employeeId, dto.outletId);
    }
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
  async deleteSchedule(@Param('id') id: string, @CurrentUser() _user: AuthUser) {
    return this.employeesService.deleteSchedule(id);
  }

  private async validateScheduleAccess(businessId: string, employeeId?: string, outletId?: string) {
    if (employeeId) {
      const employee = await this.employeeRepo.findById(employeeId);
      if (!employee || employee.businessId !== businessId) {
        throw new NotFoundException('Employee not found');
      }
    }
    if (outletId) {
      const outlet = await this.prisma.outlet.findFirst({
        where: { id: outletId, businessId },
        select: { id: true },
      });
      if (!outlet) {
        throw new NotFoundException('Outlet not found');
      }
    }
  }

  // ==========================================================================
  // 3. Commission Calculator
  // ==========================================================================

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

  @Post(':id/attendance/clock-in')
  async clockIn(@Param('id') id: string, @Body() dto: ClockInDto, @CurrentUser() user: AuthUser) {
    const employee = await this.employeeRepo.findById(id);
    if (!employee || employee.businessId !== user.businessId) {
      throw new NotFoundException('Employee not found');
    }
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
