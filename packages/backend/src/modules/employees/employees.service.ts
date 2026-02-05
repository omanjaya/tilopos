import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BusinessError } from '../../shared/errors/business-error';
import { ErrorCode } from '../../shared/constants/error-codes';

// ============================================================================
// Response Interfaces
// ============================================================================

interface ShiftDetail {
  shiftId: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  sales: number;
  transactions: number;
  cashDifference: number | null;
}

export interface EmployeeShiftReport {
  employeeId: string;
  employeeName: string;
  totalShifts: number;
  totalHoursWorked: number;
  averageShiftDuration: number;
  totalSales: number;
  totalTransactions: number;
  cashVariance: number;
  shifts: ShiftDetail[];
}

export interface EmployeeShiftSummary {
  employeeId: string;
  employeeName: string;
  totalShifts: number;
  totalHoursWorked: number;
  totalSales: number;
  totalTransactions: number;
  cashVariance: number;
}

export interface ScheduleEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
}

interface WeeklyScheduleDay {
  date: string;
  dayOfWeek: string;
  entries: ScheduleEntry[];
}

export interface WeeklyScheduleGrid {
  weekStart: string;
  weekEnd: string;
  days: WeeklyScheduleDay[];
}

interface TransactionCommission {
  transactionId: string;
  amount: number;
  commission: number;
}

export interface EmployeeCommission {
  employeeId: string;
  period: { from: string; to: string };
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
  transactions: TransactionCommission[];
}

export interface EmployeeCommissionSummary {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
  transactionCount: number;
}

export interface AttendanceRecord {
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  status: 'present' | 'absent' | 'late';
}

export interface AttendanceClockInResult {
  attendanceId: string;
  clockInTime: string;
}

export interface AttendanceClockOutResult {
  attendanceId: string;
  clockOutTime: string;
  hoursWorked: number;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalHoursWorked: number;
}

// ============================================================================
// Commission Rate Configuration
// ============================================================================

const COMMISSION_RATES: Record<string, number> = {
  cashier: 0.01,
  supervisor: 0.015,
  manager: 0.02,
  owner: 0.0,
  super_admin: 0.0,
  kitchen: 0.005,
  inventory: 0.005,
};

const DEFAULT_COMMISSION_RATE = 0.01;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // 1. Shift Reports
  // ==========================================================================

  async getEmployeeShiftReport(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeShiftReport> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        startedAt: { gte: from, lte: to },
      },
      include: {
        transactions: {
          where: { status: 'completed' },
          select: { id: true, grandTotal: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    let totalHoursWorked = 0;
    let totalSales = 0;
    let totalTransactions = 0;
    let cashVariance = 0;

    const shiftDetails: ShiftDetail[] = shifts.map((shift) => {
      const endTime = shift.endedAt;
      const durationMs = endTime ? endTime.getTime() - shift.startedAt.getTime() : 0;
      const durationHours = durationMs / (1000 * 60 * 60);

      const shiftSales = shift.transactions.reduce((sum, t) => sum + t.grandTotal.toNumber(), 0);
      const shiftTransactions = shift.transactions.length;
      const shiftCashDiff = shift.cashDifference ? shift.cashDifference.toNumber() : null;

      totalHoursWorked += durationHours;
      totalSales += shiftSales;
      totalTransactions += shiftTransactions;
      if (shiftCashDiff !== null) {
        cashVariance += shiftCashDiff;
      }

      return {
        shiftId: shift.id,
        startTime: shift.startedAt.toISOString(),
        endTime: endTime ? endTime.toISOString() : null,
        duration: Math.round(durationHours * 100) / 100,
        sales: shiftSales,
        transactions: shiftTransactions,
        cashDifference: shiftCashDiff,
      };
    });

    const totalShifts = shifts.length;
    const averageShiftDuration =
      totalShifts > 0 ? Math.round((totalHoursWorked / totalShifts) * 100) / 100 : 0;

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      totalShifts,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      averageShiftDuration,
      totalSales,
      totalTransactions,
      cashVariance: Math.round(cashVariance * 100) / 100,
      shifts: shiftDetails,
    };
  }

  async getAllEmployeeShiftSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeShiftSummary[]> {
    const employees = await this.prisma.employee.findMany({
      where: { outletId, isActive: true },
      select: { id: true, name: true },
    });

    const summaries: EmployeeShiftSummary[] = [];

    for (const employee of employees) {
      const shifts = await this.prisma.shift.findMany({
        where: {
          employeeId: employee.id,
          outletId,
          startedAt: { gte: from, lte: to },
        },
        include: {
          transactions: {
            where: { status: 'completed' },
            select: { grandTotal: true },
          },
        },
      });

      let totalHoursWorked = 0;
      let totalSales = 0;
      let totalTransactions = 0;
      let cashVariance = 0;

      for (const shift of shifts) {
        if (shift.endedAt) {
          const durationMs = shift.endedAt.getTime() - shift.startedAt.getTime();
          totalHoursWorked += durationMs / (1000 * 60 * 60);
        }
        totalSales += shift.transactions.reduce((sum, t) => sum + t.grandTotal.toNumber(), 0);
        totalTransactions += shift.transactions.length;
        if (shift.cashDifference) {
          cashVariance += shift.cashDifference.toNumber();
        }
      }

      summaries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        totalShifts: shifts.length,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        totalSales,
        totalTransactions,
        cashVariance: Math.round(cashVariance * 100) / 100,
      });
    }

    return summaries;
  }

  // ==========================================================================
  // 2. Schedule Management
  // ==========================================================================

  async createSchedule(data: {
    employeeId: string;
    outletId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<ScheduleEntry> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true, name: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const schedule = await this.prisma.employeeSchedule.create({
      data: {
        employeeId: data.employeeId,
        outletId: data.outletId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes ?? null,
      },
      include: {
        employee: { select: { name: true } },
      },
    });

    return {
      id: schedule.id,
      employeeId: schedule.employeeId,
      employeeName: schedule.employee.name,
      outletId: schedule.outletId,
      date: schedule.date.toISOString().split('T')[0],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      notes: schedule.notes,
    };
  }

  async getWeeklySchedule(outletId: string, weekStart: Date): Promise<WeeklyScheduleGrid> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: {
        outletId,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        employee: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const days: WeeklyScheduleDay[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayEntries = schedules
        .filter((s) => s.date.toISOString().split('T')[0] === dateStr)
        .map((s) => ({
          id: s.id,
          employeeId: s.employeeId,
          employeeName: s.employee.name,
          outletId: s.outletId,
          date: dateStr,
          startTime: s.startTime,
          endTime: s.endTime,
          notes: s.notes,
        }));

      days.push({
        date: dateStr,
        dayOfWeek: dayNames[currentDate.getDay()],
        entries: dayEntries,
      });
    }

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      days,
    };
  }

  async updateSchedule(
    scheduleId: string,
    data: {
      employeeId?: string;
      outletId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
    },
  ): Promise<ScheduleEntry> {
    const existing = await this.prisma.employeeSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new BusinessError(ErrorCode.SCHEDULE_NOT_FOUND, 'Schedule entry not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.outletId !== undefined) updateData.outletId = data.outletId;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await this.prisma.employeeSchedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        employee: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      employeeId: updated.employeeId,
      employeeName: updated.employee.name,
      outletId: updated.outletId,
      date: updated.date.toISOString().split('T')[0],
      startTime: updated.startTime,
      endTime: updated.endTime,
      notes: updated.notes,
    };
  }

  async deleteSchedule(scheduleId: string): Promise<{ message: string }> {
    const existing = await this.prisma.employeeSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw new BusinessError(ErrorCode.SCHEDULE_NOT_FOUND, 'Schedule entry not found');
    }

    await this.prisma.employeeSchedule.delete({
      where: { id: scheduleId },
    });

    return { message: 'Schedule entry deleted' };
  }

  // ==========================================================================
  // 3. Commission Calculator
  // ==========================================================================

  async getEmployeeCommissions(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeCommission> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, role: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const commissionRate = COMMISSION_RATES[employee.role] ?? DEFAULT_COMMISSION_RATE;

    const transactions = await this.prisma.transaction.findMany({
      where: {
        employeeId,
        status: 'completed',
        transactionType: 'sale',
        createdAt: { gte: from, lte: to },
      },
      select: { id: true, grandTotal: true },
      orderBy: { createdAt: 'asc' },
    });

    let totalSales = 0;
    const transactionCommissions: TransactionCommission[] = transactions.map((t) => {
      const amount = t.grandTotal.toNumber();
      totalSales += amount;
      const commission = Math.round(amount * commissionRate * 100) / 100;
      return {
        transactionId: t.id,
        amount,
        commission,
      };
    });

    const commissionAmount = Math.round(totalSales * commissionRate * 100) / 100;

    return {
      employeeId,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totalSales,
      commissionRate,
      commissionAmount,
      transactions: transactionCommissions,
    };
  }

  async getAllEmployeeCommissionSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeCommissionSummary[]> {
    const employees = await this.prisma.employee.findMany({
      where: { outletId, isActive: true },
      select: { id: true, name: true, role: true },
    });

    const summaries: EmployeeCommissionSummary[] = [];

    for (const employee of employees) {
      const commissionRate = COMMISSION_RATES[employee.role] ?? DEFAULT_COMMISSION_RATE;

      const result = await this.prisma.transaction.aggregate({
        where: {
          employeeId: employee.id,
          status: 'completed',
          transactionType: 'sale',
          createdAt: { gte: from, lte: to },
        },
        _sum: { grandTotal: true },
        _count: { id: true },
      });

      const totalSales = result._sum.grandTotal?.toNumber() ?? 0;
      const transactionCount = result._count.id;
      const commissionAmount = Math.round(totalSales * commissionRate * 100) / 100;

      summaries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        totalSales,
        commissionRate,
        commissionAmount,
        transactionCount,
      });
    }

    return summaries;
  }

  // ==========================================================================
  // 4. Attendance Tracking
  // ==========================================================================

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
