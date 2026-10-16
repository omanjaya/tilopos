import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EmployeeRole as PrismaEmployeeRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { OutletAccessGuard } from '../../shared/guards/outlet-access.guard';
import { EmployeeRole, ROLE_HIERARCHY, canManageRole } from '../../shared/constants/roles';
import { money, sumMoney, toNumber } from '../../shared/utils/money';
import { LogAuditEventUseCase } from '../../application/use-cases/audit/log-audit-event.use-case';
import { computeShiftCash } from '../../application/use-cases/employees/shift-cash';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesQueryDto,
  ListEmployeeShiftsQueryDto,
} from '../../application/dtos/employee.dto';

const PIN_COST = 10;
const MAX_EMPLOYEE_LIST = 500;
const DEFAULT_SHIFT_PAGE = 50;

/** Only these columns ever leave the API for an employee (never pin/mfaSecret/googleId). */
const EMPLOYEE_RESPONSE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  outletId: true,
  hourlyRate: true,
  isActive: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
  outlet: { select: { name: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof EMPLOYEE_RESPONSE_SELECT }>;

export interface EmployeeResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  outletId: string | null;
  outletName: string;
  hourlyRate: number | null;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

/** Target employee as needed for authorization decisions. */
export interface EmployeeRef {
  id: string;
  businessId: string;
  outletId: string | null;
  role: string;
  isActive: boolean;
  name: string;
}

export function toEmployeeResponse(e: EmployeeRow): EmployeeResponse {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    role: e.role,
    outletId: e.outletId,
    outletName: e.outlet?.name ?? '',
    hourlyRate: e.hourlyRate ? toNumber(e.hourlyRate) : null,
    isActive: e.isActive,
    businessId: e.businessId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function rank(role: string): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Employee directory, authorization rules for acting on other employees, and
 * shift listings. Keeps PrismaService out of the controller (R18).
 */
@Injectable()
export class EmployeeManagementService {
  private readonly logger = new Logger(EmployeeManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly logAuditEvent: LogAuditEventUseCase,
  ) {}

  // ==========================================================================
  // Authorization helpers
  // ==========================================================================

  /** Loads an employee of the caller's business or throws 404. */
  async loadInBusiness(user: AuthUser, id: string): Promise<EmployeeRef> {
    const employee = await this.prisma.employee.findFirst({
      where: { id, businessId: user.businessId },
      select: {
        id: true,
        businessId: true,
        outletId: true,
        role: true,
        isActive: true,
        name: true,
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  /**
   * Acting on an employee record (shift, attendance): always allowed on
   * yourself; on others only with at least `minRole`, a higher role than the
   * target, and (non-owners) inside your own outlet.
   */
  assertCanActOn(
    user: AuthUser,
    target: Pick<EmployeeRef, 'id' | 'outletId' | 'role'>,
    minRole: EmployeeRole = EmployeeRole.SUPERVISOR,
  ): void {
    if (target.id === user.employeeId) {
      return;
    }
    if (rank(user.role) < rank(minRole)) {
      throw new ForbiddenException('You can only perform this action for yourself');
    }
    if (!canManageRole(user.role, target.role)) {
      throw new ForbiddenException(
        'You cannot act on an employee with a role equal to or higher than your own',
      );
    }
    OutletAccessGuard.enforceOutletAccess(user, target.outletId, 'employee');
  }

  /**
   * Client-supplied outlet: must belong to the business, and non-owner callers
   * that are assigned to an outlet may only use that outlet.
   */
  async assertOutletUsable(user: AuthUser, outletId: string): Promise<string> {
    await this.tenant.assertOutlet(user, outletId);
    if (
      !OutletAccessGuard.canAccessAllOutlets(user) &&
      user.outletId &&
      user.outletId !== outletId
    ) {
      throw new ForbiddenException('You can only use your assigned outlet');
    }
    return outletId;
  }

  /** Report queries over an outlet: tenant check + own-outlet rule for non-owners. */
  async assertReportOutlet(user: AuthUser, outletId: string): Promise<void> {
    await this.tenant.assertOutlet(user, outletId);
    OutletAccessGuard.enforceOutletAccess(user, outletId, 'outlet');
  }

  /** Login is by email, so an email may belong to at most one active employee. */
  private async assertEmailAvailable(email: string, excludeId?: string): Promise<void> {
    const clash = await this.prisma.employee.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        isActive: true,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException('Email is already used by another employee');
    }
  }

  private audit(entry: Parameters<LogAuditEventUseCase['execute']>[0]): void {
    this.logAuditEvent.execute(entry).catch((err: unknown) => {
      this.logger.warn(
        `Audit log write failed (${entry.action} ${entry.entityType}:${entry.entityId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  // ==========================================================================
  // Employee CRUD
  // ==========================================================================

  async list(user: AuthUser, query: ListEmployeesQueryDto): Promise<EmployeeResponse[]> {
    // Owner/super_admin can see all outlets, others only their assigned outlet
    const accessibleOutletId = OutletAccessGuard.getAccessibleOutletId(user, query.outletId);
    if (accessibleOutletId) {
      await this.tenant.assertOutlet(user, accessibleOutletId);
    }
    const take = Math.min(query.limit ?? MAX_EMPLOYEE_LIST, MAX_EMPLOYEE_LIST);
    const skip = ((query.page ?? 1) - 1) * take;

    const status = query.status ?? 'active';
    const search = query.search?.trim();
    const employees = await this.prisma.employee.findMany({
      where: {
        businessId: user.businessId,
        ...(status === 'all' ? {} : { isActive: status === 'active' }),
        ...(query.role ? { role: query.role as PrismaEmployeeRole } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search } },
              ],
            }
          : {}),
        ...OutletAccessGuard.buildOutletFilter(accessibleOutletId),
      },
      select: EMPLOYEE_RESPONSE_SELECT,
      orderBy: { name: 'asc' },
      take,
      skip,
    });
    return employees.map(toEmployeeResponse);
  }

  async get(user: AuthUser, id: string): Promise<EmployeeResponse> {
    const e = await this.prisma.employee.findFirst({
      where: { id, businessId: user.businessId },
      select: EMPLOYEE_RESPONSE_SELECT,
    });
    if (!e) throw new NotFoundException('Employee not found');
    // Enforce outlet access (owner can see all)
    OutletAccessGuard.enforceOutletAccess(user, e.outletId, 'employee');
    return toEmployeeResponse(e);
  }

  async create(user: AuthUser, dto: CreateEmployeeDto): Promise<EmployeeResponse> {
    if (!canManageRole(user.role, dto.role)) {
      throw new ForbiddenException('You cannot assign a role equal to or higher than your own');
    }
    if (dto.outletId) {
      await this.assertOutletUsable(user, dto.outletId);
    } else if (!OutletAccessGuard.canAccessAllOutlets(user)) {
      throw new BadRequestException('outletId is required');
    }
    if (dto.email) {
      await this.assertEmailAvailable(dto.email);
    }

    const hashedPin = dto.pin ? await bcrypt.hash(dto.pin, PIN_COST) : null;

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
      select: EMPLOYEE_RESPONSE_SELECT,
    });
    return toEmployeeResponse(created);
  }

  async update(user: AuthUser, id: string, dto: UpdateEmployeeDto): Promise<EmployeeResponse> {
    const employee = await this.loadInBusiness(user, id);

    // Enforce outlet access (owner can update all)
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');

    // Requester must outrank the target (this also rules out editing yourself here)
    if (!canManageRole(user.role, employee.role)) {
      throw new ForbiddenException(
        'You cannot modify an employee with a role equal to or higher than your own',
      );
    }
    if (dto.role !== undefined && !canManageRole(user.role, dto.role)) {
      throw new ForbiddenException('You cannot assign a role equal to or higher than your own');
    }
    if (dto.outletId !== undefined) {
      await this.assertOutletUsable(user, dto.outletId);
    }
    if (dto.email !== undefined && dto.email !== null) {
      await this.assertEmailAvailable(dto.email, id);
    }

    const data: Prisma.EmployeeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.role !== undefined) data.role = dto.role as PrismaEmployeeRole;
    if (dto.outletId !== undefined) data.outlet = { connect: { id: dto.outletId } };
    if (dto.hourlyRate !== undefined) data.hourlyRate = dto.hourlyRate;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.pin) data.pin = await bcrypt.hash(dto.pin, PIN_COST);

    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data,
      select: EMPLOYEE_RESPONSE_SELECT,
    });

    if (dto.role !== undefined && dto.role !== employee.role) {
      this.logger.log(
        `Role changed: employee=${id} from=${employee.role} to=${dto.role} by=${user.employeeId}`,
      );
      this.audit({
        businessId: user.businessId,
        outletId: employee.outletId || undefined,
        employeeId: user.employeeId,
        action: 'CHANGE_ROLE',
        entityType: 'employee',
        entityId: id,
        oldValue: { role: employee.role },
        newValue: { role: dto.role },
      });
    }

    return toEmployeeResponse(updated);
  }

  async deactivate(user: AuthUser, id: string): Promise<{ message: string }> {
    if (id === user.employeeId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const employee = await this.loadInBusiness(user, id);
    OutletAccessGuard.enforceOutletAccess(user, employee.outletId, 'employee');
    if (!canManageRole(user.role, employee.role)) {
      throw new ForbiddenException(
        'You cannot deactivate an employee with a role equal to or higher than your own',
      );
    }

    await this.prisma.employee.updateMany({
      where: { id: employee.id, businessId: user.businessId },
      data: { isActive: false },
    });
    this.audit({
      businessId: user.businessId,
      outletId: employee.outletId || undefined,
      employeeId: user.employeeId,
      action: 'DEACTIVATE_EMPLOYEE',
      entityType: 'employee',
      entityId: id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
    });
    return { message: 'Employee deactivated' };
  }

  // ==========================================================================
  // Shifts
  // ==========================================================================

  /** Records that a supervisor+ ended a shift on behalf of someone else. */
  auditShiftEndOnBehalf(
    user: AuthUser,
    target: EmployeeRef,
    shiftId: string,
    closingCash: number,
  ): void {
    if (target.id === user.employeeId) return;
    this.audit({
      businessId: user.businessId,
      outletId: target.outletId || undefined,
      employeeId: user.employeeId,
      action: 'END_SHIFT_ON_BEHALF',
      entityType: 'shift',
      entityId: shiftId,
      newValue: { employeeId: target.id, closingCash },
    });
  }

  /** Newest-first shift history of one employee, paged; sales via one groupBy. */
  async listShifts(user: AuthUser, employeeId: string, query: ListEmployeeShiftsQueryDto) {
    const employee = await this.loadInBusiness(user, employeeId);
    this.assertCanActOn(user, employee, EmployeeRole.MANAGER);

    // Owner/super_admin can filter by outlet; others see their outlet (self: all own shifts)
    const accessibleOutletId =
      employee.id === user.employeeId
        ? query.outletId
        : OutletAccessGuard.getAccessibleOutletId(user, query.outletId);
    if (accessibleOutletId) {
      await this.tenant.assertOutlet(user, accessibleOutletId);
    }

    const take = query.limit ?? DEFAULT_SHIFT_PAGE;
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId: employee.id,
        outlet: { businessId: user.businessId },
        ...OutletAccessGuard.buildOutletFilter(accessibleOutletId),
      },
      include: {
        outlet: { select: { name: true } },
        employee: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take,
      skip: ((query.page ?? 1) - 1) * take,
    });

    const sales =
      shifts.length === 0
        ? []
        : await this.prisma.transaction.groupBy({
            by: ['shiftId'],
            where: { shiftId: { in: shifts.map((s) => s.id) }, status: 'completed' },
            _sum: { grandTotal: true },
            _count: { id: true },
          });
    const salesByShift = new Map(sales.map((r) => [r.shiftId, r]));

    return shifts.map((s) => {
      const row = salesByShift.get(s.id);
      return {
        id: s.id,
        employeeId: s.employeeId,
        employeeName: s.employee.name,
        outletId: s.outletId,
        outletName: s.outlet.name,
        openingCash: toNumber(s.openingCash),
        closingCash: s.closingCash ? toNumber(s.closingCash) : null,
        expectedCash: s.expectedCash ? toNumber(s.expectedCash) : null,
        cashDifference: s.cashDifference ? toNumber(s.cashDifference) : null,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        notes: s.notes,
        totalSales: toNumber(row?._sum.grandTotal),
        totalTransactions: row?._count.id ?? 0,
      };
    });
  }

  /**
   * Live totals of a shift (for the close-shift dialog): expected cash and the
   * per-method payment breakdown. Owner of the shift or supervisor+ of its outlet.
   */
  async getShiftSummary(user: AuthUser, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, outlet: { businessId: user.businessId } },
      include: { employee: { select: { id: true, outletId: true, role: true } } },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    this.assertCanActOn(user, { ...shift.employee, outletId: shift.outletId });

    const [totals, breakdown] = await Promise.all([
      computeShiftCash(this.prisma, shift),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: {
          transaction: { shiftId: shift.id, transactionType: 'sale', status: 'completed' },
          status: 'completed',
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      shiftId: shift.id,
      status: shift.status,
      openingCash: toNumber(shift.openingCash),
      transactionCount: totals.transactionCount,
      totalSales: toNumber(totals.totalSales),
      cashSales: toNumber(totals.cashSales),
      cashRefunds: toNumber(totals.cashRefunds),
      cashIn: toNumber(shift.cashIn),
      cashOut: toNumber(shift.cashOut),
      expectedCash: toNumber(totals.expectedCash),
      paymentBreakdown: breakdown.map((b) => ({
        method: b.paymentMethod,
        amount: toNumber(money(b._sum.amount)),
        count: b._count.id,
      })),
      paymentTotal: toNumber(sumMoney(breakdown.map((b) => b._sum.amount))),
    };
  }
}
