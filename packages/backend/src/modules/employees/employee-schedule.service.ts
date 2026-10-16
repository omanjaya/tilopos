import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BusinessError } from '../../shared/errors/business-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import {
  ScheduleEntry,
  WeeklyScheduleGrid,
  WeeklyScheduleDay,
  CreateScheduleData,
  UpdateScheduleData,
} from './employee.types';
import { DAY_NAMES } from './employee.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Schedule `date` is a calendar date column (@db.Date). Work with it purely as
 * UTC midnight of the `YYYY-MM-DD` value so no server/WIB offset can shift it.
 */
function toDateColumn(value: string): Date {
  const key = value.slice(0, 10);
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid date "${value}"`);
  }
  return date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type Tx = Prisma.TransactionClient;

/**
 * Service responsible for managing employee schedules. Every read/write by id
 * is scoped to the caller's business through the employee relation.
 */
@Injectable()
export class EmployeeScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws when [startTime, endTime) overlaps another schedule of the employee that day. */
  private async assertNoOverlap(
    tx: Tx,
    employeeId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
    const overlapping = await tx.employeeSchedule.findFirst({
      where: {
        employeeId,
        date,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { startTime: true, endTime: true },
    });
    if (overlapping) {
      throw new BadRequestException(
        `Jadwal tumpang tindih: karyawan sudah dijadwalkan ${overlapping.startTime} - ${overlapping.endTime}`,
      );
    }
  }

  private toEntry(s: {
    id: string;
    employeeId: string;
    outletId: string;
    date: Date;
    startTime: string;
    endTime: string;
    notes: string | null;
    employee: { name: string };
  }): ScheduleEntry {
    return {
      id: s.id,
      employeeId: s.employeeId,
      employeeName: s.employee.name,
      outletId: s.outletId,
      date: dateKey(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      notes: s.notes,
    };
  }

  /**
   * Create a schedule entry. The overlap check and insert run in one
   * Serializable transaction so concurrent requests cannot double-book.
   */
  async createSchedule(data: CreateScheduleData, businessId: string): Promise<ScheduleEntry> {
    const date = toDateColumn(data.date);
    const schedule = await this.prisma.$transaction(
      async (tx) => {
        const employee = await tx.employee.findFirst({
          where: { id: data.employeeId, businessId },
          select: { id: true },
        });
        if (!employee) {
          throw new NotFoundException('Employee not found');
        }
        await this.assertNoOverlap(tx, data.employeeId, date, data.startTime, data.endTime);

        return tx.employeeSchedule.create({
          data: {
            employeeId: data.employeeId,
            outletId: data.outletId,
            date,
            startTime: data.startTime,
            endTime: data.endTime,
            notes: data.notes ?? null,
          },
          include: { employee: { select: { name: true } } },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return this.toEntry(schedule);
  }

  /**
   * Weekly schedule grid for an outlet, 7 days from `weekStart` (YYYY-MM-DD).
   */
  async getWeeklySchedule(outletId: string, weekStart: string): Promise<WeeklyScheduleGrid> {
    const start = toDateColumn(weekStart);
    const end = new Date(start.getTime() + 6 * DAY_MS);

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: { outletId, date: { gte: start, lte: end } },
      include: { employee: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const days: WeeklyScheduleDay[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(start.getTime() + i * DAY_MS);
      const key = dateKey(current);
      days.push({
        date: key,
        dayOfWeek: DAY_NAMES[current.getUTCDay()],
        entries: schedules.filter((s) => dateKey(s.date) === key).map((s) => this.toEntry(s)),
      });
    }

    return { weekStart: dateKey(start), weekEnd: dateKey(end), days };
  }

  /**
   * Update a schedule entry of the caller's business, re-checking overlap.
   * `outletScope` limits non-owner callers to schedules of their own outlet.
   */
  async updateSchedule(
    scheduleId: string,
    data: UpdateScheduleData,
    businessId: string,
    outletScope?: string,
  ): Promise<ScheduleEntry> {
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.employeeSchedule.findFirst({
          where: {
            id: scheduleId,
            employee: { businessId },
            ...(outletScope ? { outletId: outletScope } : {}),
          },
        });
        if (!existing) {
          throw new BusinessError(ErrorCode.SCHEDULE_NOT_FOUND, 'Schedule entry not found');
        }

        const employeeId = data.employeeId ?? existing.employeeId;
        const date = data.date !== undefined ? toDateColumn(data.date) : existing.date;
        const startTime = data.startTime ?? existing.startTime;
        const endTime = data.endTime ?? existing.endTime;
        await this.assertNoOverlap(tx, employeeId, date, startTime, endTime, scheduleId);

        return tx.employeeSchedule.update({
          where: { id: existing.id },
          data: {
            employeeId,
            outletId: data.outletId ?? existing.outletId,
            date,
            startTime,
            endTime,
            ...(data.notes !== undefined && { notes: data.notes }),
          },
          include: { employee: { select: { name: true } } },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return this.toEntry(updated);
  }

  /**
   * Delete a schedule entry of the caller's business.
   */
  async deleteSchedule(
    scheduleId: string,
    businessId: string,
    outletScope?: string,
  ): Promise<{ message: string }> {
    const deleted = await this.prisma.employeeSchedule.deleteMany({
      where: {
        id: scheduleId,
        employee: { businessId },
        ...(outletScope ? { outletId: outletScope } : {}),
      },
    });
    if (deleted.count === 0) {
      throw new BusinessError(ErrorCode.SCHEDULE_NOT_FOUND, 'Schedule entry not found');
    }
    return { message: 'Schedule entry deleted' };
  }
}
