import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { EMPLOYEE_PUBLIC_SELECT } from '../../shared/constants/selects';
import { businessDayRange, parseBusinessDate } from '../../shared/utils/business-time';
import type { CreateAppointmentDto, UpdateAppointmentDto } from './appointments.dto';

const LIST_LIMIT = 500;
const MAX_RANGE_DAYS = 93;
const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.scheduled,
  AppointmentStatus.confirmed,
  AppointmentStatus.in_progress,
];

/** Allowed status transitions (terminal states cannot be left). */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
  confirmed: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  employee: { select: EMPLOYEE_PUBLIC_SELECT },
} satisfies Prisma.AppointmentInclude;

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  /** Every client-supplied reference must belong to the caller's business (R3). */
  private async assertRefs(
    businessId: string,
    refs: { outletId?: string; customerId?: string; employeeId?: string },
  ): Promise<void> {
    await this.tenant.assertOwned('outlet', refs.outletId, businessId);
    await this.tenant.assertOwned('customer', refs.customerId, businessId);
    await this.tenant.assertOwned('employee', refs.employeeId, businessId);
  }

  /**
   * Rejects double-booking of an employee. Runs inside the write transaction after
   * taking a per-employee advisory lock, so concurrent bookings are serialized.
   */
  private async assertEmployeeFree(
    db: Db,
    businessId: string,
    employeeId: string | null | undefined,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<void> {
    if (!employeeId) return;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment:${employeeId}`}))`;
    const overlapping = await db.appointment.findFirst({
      where: {
        businessId,
        employeeId,
        status: { in: ACTIVE_STATUSES },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new ConflictException('Employee already has an appointment in this time slot');
    }
  }

  private toStart(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid startTime');
    return date;
  }

  async create(businessId: string, data: CreateAppointmentDto) {
    await this.assertRefs(businessId, data);
    const startTime = this.toStart(data.startTime);
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      await this.assertEmployeeFree(tx, businessId, data.employeeId, startTime, endTime);
      return tx.appointment.create({
        data: {
          businessId,
          outletId: data.outletId,
          customerId: data.customerId ?? null,
          employeeId: data.employeeId ?? null,
          serviceName: data.serviceName,
          servicePrice: data.servicePrice,
          startTime,
          endTime,
          durationMinutes: data.durationMinutes,
          notes: data.notes ?? null,
          customerName: data.customerName ?? null,
          customerPhone: data.customerPhone ?? null,
        },
        include: INCLUDE,
      });
    });
  }

  async update(id: string, businessId: string, data: UpdateAppointmentDto) {
    const existing = await this.prisma.appointment.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
    await this.assertRefs(businessId, data);

    const updateData: Prisma.AppointmentUncheckedUpdateManyInput = {};
    if (data.outletId !== undefined) updateData.outletId = data.outletId;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;
    if (data.servicePrice !== undefined) updateData.servicePrice = data.servicePrice;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;

    const startTime = data.startTime ? this.toStart(data.startTime) : existing.startTime;
    const durationMinutes = data.durationMinutes ?? existing.durationMinutes;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    if (data.startTime !== undefined || data.durationMinutes !== undefined) {
      updateData.startTime = startTime;
      updateData.endTime = endTime;
      updateData.durationMinutes = durationMinutes;
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertEmployeeFree(
        tx,
        businessId,
        data.employeeId ?? existing.employeeId,
        startTime,
        endTime,
        id,
      );
      const { count } = await tx.appointment.updateMany({
        where: { id, businessId },
        data: updateData,
      });
      if (count === 0) throw new NotFoundException(`Appointment ${id} not found`);
      return tx.appointment.findFirstOrThrow({ where: { id, businessId }, include: INCLUDE });
    });
  }

  async cancel(id: string, businessId: string, reason?: string) {
    return this.transition(id, businessId, AppointmentStatus.cancelled, {
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
    });
  }

  async updateStatus(id: string, businessId: string, status: AppointmentStatus) {
    if (status === AppointmentStatus.cancelled) {
      return this.cancel(id, businessId);
    }
    return this.transition(id, businessId, status, {});
  }

  /** Conditional status change: only from the status we validated (R9). */
  private async transition(
    id: string,
    businessId: string,
    to: AppointmentStatus,
    extra: Prisma.AppointmentUpdateManyMutationInput,
  ) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, businessId },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException(`Appointment ${id} not found`);
    if (!APPOINTMENT_TRANSITIONS[existing.status].includes(to)) {
      throw new BadRequestException(`Cannot change status from ${existing.status} to ${to}`);
    }

    const { count } = await this.prisma.appointment.updateMany({
      where: { id, businessId, status: existing.status },
      data: { ...extra, status: to },
    });
    if (count === 0) {
      throw new ConflictException('Appointment was changed by someone else, reload and retry');
    }
    return this.prisma.appointment.findFirstOrThrow({
      where: { id, businessId },
      include: INCLUDE,
    });
  }

  async findById(id: string, businessId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, businessId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        employee: { select: EMPLOYEE_PUBLIC_SELECT },
      },
    });
    if (!appointment) throw new NotFoundException(`Appointment ${id} not found`);
    return appointment;
  }

  /** `date` is a WIB business date (YYYY-MM-DD); defaults to today in WIB. */
  async listByDate(outletId: string, businessId: string, date?: string) {
    await this.tenant.assertOwned('outlet', outletId, businessId);
    let range: { start: Date; end: Date };
    try {
      range = date ? parseBusinessDate(date) : businessDayRange();
    } catch {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }

    return this.prisma.appointment.findMany({
      where: { outletId, businessId, startTime: { gte: range.start, lte: range.end } },
      include: INCLUDE,
      orderBy: { startTime: 'asc' },
      take: LIST_LIMIT,
    });
  }

  async listByEmployee(employeeId: string, businessId: string, startDate: string, endDate: string) {
    await this.tenant.assertOwned('employee', employeeId, businessId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new BadRequestException('Invalid date range');
    }
    if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    return this.prisma.appointment.findMany({
      where: { employeeId, businessId, startTime: { gte: start, lte: end } },
      include: INCLUDE,
      orderBy: { startTime: 'asc' },
      take: LIST_LIMIT,
    });
  }

  async listByCustomer(customerId: string, businessId: string) {
    await this.tenant.assertOwned('customer', customerId, businessId);
    return this.prisma.appointment.findMany({
      where: { customerId, businessId },
      include: INCLUDE,
      orderBy: { startTime: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async checkAvailability(
    businessId: string,
    outletId: string,
    employeeId: string,
    startTime: string,
    durationMinutes: number,
    excludeId?: string,
  ) {
    await this.assertRefs(businessId, { outletId, employeeId });
    const start = this.toStart(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        businessId,
        employeeId,
        status: { in: ACTIVE_STATUSES },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true },
    });

    return { available: !overlapping };
  }

  async getUpcoming(outletId: string, businessId: string) {
    await this.tenant.assertOwned('outlet', outletId, businessId);
    return this.prisma.appointment.findMany({
      where: {
        outletId,
        businessId,
        startTime: { gte: new Date() },
        status: { in: [AppointmentStatus.scheduled, AppointmentStatus.confirmed] },
      },
      include: INCLUDE,
      orderBy: { startTime: 'asc' },
      take: LIST_LIMIT,
    });
  }
}
