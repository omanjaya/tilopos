import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BusinessError } from '../../shared/errors/business-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import {
  AttendanceRecord,
  AttendanceClockInResult,
  AttendanceClockOutResult,
  EmployeeAttendanceSummary,
} from './employee.types';

/**
 * Service responsible for managing employee attendance.
 * Handles clock-in/out operations, attendance records, and attendance summaries.
 */
@Injectable()
export class EmployeeAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clock in an employee for their shift.
   * Validates that the employee is not already clocked in for the day.
   *
   * @param employeeId - Employee ID
   * @param outletId - Outlet ID
   * @returns Clock-in result with attendance ID and timestamp
   */
  async clockIn(employeeId: string, outletId: string): Promise<AttendanceClockInResult> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if already clocked in (has open attendance without clock-out today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingAttendance = await this.prisma.employeeAttendance.findFirst({
      where: {
        employeeId,
        clockOutTime: null,
        clockInTime: { gte: todayStart },
      },
    });

    if (existingAttendance) {
      throw new BusinessError(ErrorCode.ALREADY_CLOCKED_IN, 'Employee is already clocked in');
    }

    const clockInTime = new Date();

    const attendance = await this.prisma.employeeAttendance.create({
      data: {
        employeeId,
        outletId,
        clockInTime,
        status: 'present',
      },
    });

    return {
      attendanceId: attendance.id,
      clockInTime: attendance.clockInTime.toISOString(),
    };
  }

  /**
   * Clock out an employee from their current shift.
   * Calculates hours worked based on clock-in time.
   *
   * @param employeeId - Employee ID
   * @returns Clock-out result with hours worked
   */
  async clockOut(employeeId: string): Promise<AttendanceClockOutResult> {
    const attendance = await this.prisma.employeeAttendance.findFirst({
      where: {
        employeeId,
        clockOutTime: null,
      },
      orderBy: { clockInTime: 'desc' },
    });

    if (!attendance) {
      throw new BusinessError(ErrorCode.NOT_CLOCKED_IN, 'Employee is not clocked in');
    }

    const clockOutTime = new Date();
    const durationMs = clockOutTime.getTime() - attendance.clockInTime.getTime();
    const hoursWorked = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;

    const updated = await this.prisma.employeeAttendance.update({
      where: { id: attendance.id },
      data: {
        clockOutTime,
        hoursWorked: new Decimal(hoursWorked),
      },
    });

    return {
      attendanceId: updated.id,
      clockOutTime: clockOutTime.toISOString(),
      hoursWorked,
    };
  }

  /**
   * Get attendance records for a specific employee within a date range.
   *
   * @param employeeId - Employee ID
   * @param from - Start date
   * @param to - End date
   * @returns Array of attendance records
   */
  async getAttendanceRecords(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<AttendanceRecord[]> {
    const attendances = await this.prisma.employeeAttendance.findMany({
      where: {
        employeeId,
        clockInTime: { gte: from, lte: to },
      },
      orderBy: { clockInTime: 'asc' },
    });

    return attendances.map((a) => ({
      date: a.clockInTime.toISOString().split('T')[0],
      clockIn: a.clockInTime.toISOString(),
      clockOut: a.clockOutTime ? a.clockOutTime.toISOString() : null,
      hoursWorked: a.hoursWorked ? a.hoursWorked.toNumber() : null,
      status: a.status as 'present' | 'absent' | 'late',
    }));
  }

  /**
   * Get attendance summary for all active employees at an outlet within a date range.
   * Calculates present days, late days, absent days, and total hours worked.
   *
   * @param outletId - Outlet ID
   * @param from - Start date
   * @param to - End date
   * @returns Array of employee attendance summaries
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

    // Calculate total working days in the range
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    const summaries: EmployeeAttendanceSummary[] = [];

    for (const employee of employees) {
      const attendances = await this.prisma.employeeAttendance.findMany({
        where: {
          employeeId: employee.id,
          outletId,
          clockInTime: { gte: from, lte: to },
        },
      });

      let presentDays = 0;
      let lateDays = 0;
      let totalHoursWorked = 0;

      for (const a of attendances) {
        if (a.status === 'present') presentDays++;
        if (a.status === 'late') lateDays++;
        if (a.hoursWorked) {
          totalHoursWorked += a.hoursWorked.toNumber();
        }
      }

      const attendedDays = presentDays + lateDays;
      const absentDays = Math.max(0, totalDays - attendedDays);

      summaries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      });
    }

    return summaries;
  }
}
