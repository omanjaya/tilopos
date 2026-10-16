import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BusinessError } from '../../shared/errors/business-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import { startOfBusinessDay } from '../../shared/utils/business-time';
import { businessDateString, businessTimeString } from './employee-date-range';
import {
  AttendanceRecord,
  AttendanceClockInResult,
  AttendanceClockOutResult,
  EmployeeAttendanceSummary,
} from './employee.types';

/** Minutes after the scheduled start before a clock-in counts as late. */
export const LATE_GRACE_MINUTES = 5;
/** Hard cap on attendance rows returned for one employee. */
const MAX_ATTENDANCE_ROWS = 1000;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Service responsible for managing employee attendance.
 * Handles clock-in/out operations, attendance records, and attendance summaries.
 * Callers must have verified the employee and outlet belong to the caller's business.
 */
@Injectable()
export class EmployeeAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clock in an employee. Serialised per employee with a transaction-scoped
   * advisory lock so a double submit cannot create two open attendances.
   * Status is 'late' when the clock-in is after today's scheduled start + grace.
   */
  async clockIn(
    employeeId: string,
    outletId: string,
    businessId: string,
  ): Promise<AttendanceClockInResult> {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: employeeId, businessId },
        select: { id: true },
      });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attendance:${employeeId}`}))`;

      const clockInTime = new Date();

      // Any open attendance blocks a new one (DB: uq_attendance_open_per_employee), including
      // one left open on an earlier day: clock out first (clock-out closes the open record).
      const existingAttendance = await tx.employeeAttendance.findFirst({
        where: { employeeId, clockOutTime: null },
        select: { id: true, clockInTime: true },
      });
      if (existingAttendance) {
        const sameDay = existingAttendance.clockInTime >= startOfBusinessDay(clockInTime);
        throw new BusinessError(
          ErrorCode.ALREADY_CLOCKED_IN,
          sameDay
            ? 'Employee is already clocked in'
            : 'Employee has an open attendance from an earlier day; clock out first',
        );
      }

      const schedule = await tx.employeeSchedule.findFirst({
        where: {
          employeeId,
          outletId,
          date: new Date(`${businessDateString(clockInTime)}T00:00:00.000Z`),
        },
        orderBy: { startTime: 'asc' },
        select: { startTime: true },
      });
      const isLate =
        !!schedule &&
        toMinutes(businessTimeString(clockInTime)) >
          toMinutes(schedule.startTime) + LATE_GRACE_MINUTES;

      const attendance = await tx.employeeAttendance.create({
        data: { employeeId, outletId, clockInTime, status: isLate ? 'late' : 'present' },
      });

      return {
        attendanceId: attendance.id,
        clockInTime: attendance.clockInTime.toISOString(),
      };
    });
  }

  /**
   * Clock out an employee from their current attendance.
   * The close is conditional on clockOutTime still being null.
   */
  async clockOut(employeeId: string): Promise<AttendanceClockOutResult> {
    const attendance = await this.prisma.employeeAttendance.findFirst({
      where: { employeeId, clockOutTime: null },
      orderBy: { clockInTime: 'desc' },
    });

    if (!attendance) {
      throw new BusinessError(ErrorCode.NOT_CLOCKED_IN, 'Employee is not clocked in');
    }

    const clockOutTime = new Date();
    const durationMs = clockOutTime.getTime() - attendance.clockInTime.getTime();
    const hoursWorked = new Prisma.Decimal(durationMs)
      .dividedBy(1000 * 60 * 60)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const updated = await this.prisma.employeeAttendance.updateMany({
      where: { id: attendance.id, clockOutTime: null },
      data: { clockOutTime, hoursWorked },
    });
    if (updated.count !== 1) {
      throw new BusinessError(ErrorCode.NOT_CLOCKED_IN, 'Employee is not clocked in');
    }

    return {
      attendanceId: attendance.id,
      clockOutTime: clockOutTime.toISOString(),
      hoursWorked: hoursWorked.toNumber(),
    };
  }

  /**
   * Attendance records for one employee within a (capped) date range.
   */
  async getAttendanceRecords(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<AttendanceRecord[]> {
    const attendances = await this.prisma.employeeAttendance.findMany({
      where: { employeeId, clockInTime: { gte: from, lte: to } },
      orderBy: { clockInTime: 'asc' },
      take: MAX_ATTENDANCE_ROWS,
    });

    return attendances.map((a) => ({
      date: businessDateString(a.clockInTime),
      clockIn: a.clockInTime.toISOString(),
      clockOut: a.clockOutTime ? a.clockOutTime.toISOString() : null,
      hoursWorked: a.hoursWorked ? a.hoursWorked.toNumber() : null,
      status: a.status as 'present' | 'absent' | 'late',
    }));
  }

  /**
   * Attendance summary for all active employees at an outlet.
   * absentDays counts scheduled (past) days with no attendance, not calendar days.
   * Two queries total, grouped in memory (no per-employee query).
   */
  async getAttendanceSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeAttendanceSummary[]> {
    const employees = await this.prisma.employee.findMany({
      where: { outletId, isActive: true },
      select: { id: true, name: true },
    });
    if (employees.length === 0) return [];
    const employeeIds = employees.map((e) => e.id);

    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const fromKey = businessDateString(from);
    const lastKey = businessDateString(new Date(Math.min(to.getTime(), Date.now())));

    const [attendances, schedules] = await Promise.all([
      this.prisma.employeeAttendance.findMany({
        where: { employeeId: { in: employeeIds }, outletId, clockInTime: { gte: from, lte: to } },
        select: { employeeId: true, status: true, hoursWorked: true, clockInTime: true },
      }),
      this.prisma.employeeSchedule.findMany({
        where: {
          employeeId: { in: employeeIds },
          outletId,
          date: {
            gte: new Date(`${fromKey}T00:00:00.000Z`),
            lte: new Date(`${lastKey}T00:00:00.000Z`),
          },
        },
        select: { employeeId: true, date: true },
      }),
    ]);

    return employees.map((employee) => {
      let presentDays = 0;
      let lateDays = 0;
      let totalHoursWorked = new Prisma.Decimal(0);
      const attendedDates = new Set<string>();

      for (const a of attendances) {
        if (a.employeeId !== employee.id) continue;
        if (a.status === 'present') presentDays++;
        if (a.status === 'late') lateDays++;
        if (a.hoursWorked) totalHoursWorked = totalHoursWorked.plus(a.hoursWorked);
        attendedDates.add(businessDateString(a.clockInTime));
      }

      const scheduledDates = new Set(
        schedules
          .filter((s) => s.employeeId === employee.id)
          .map((s) => s.date.toISOString().slice(0, 10)),
      );
      let absentDays = 0;
      for (const d of scheduledDates) {
        if (!attendedDates.has(d)) absentDays++;
      }

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        totalHoursWorked: totalHoursWorked
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toNumber(),
      };
    });
  }
}
