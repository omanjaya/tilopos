import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { money, sumMoney, toNumber } from '../../shared/utils/money';
import { EmployeeShiftReport, EmployeeShiftSummary, ShiftDetail } from './employee.types';

/** Hard cap on shifts loaded for one report. */
const MAX_REPORT_SHIFTS = 1000;
const HOUR_MS = 1000 * 60 * 60;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Service responsible for generating shift reports and summaries for employees.
 * Sales are summed in the database (groupBy) and money uses Prisma.Decimal.
 */
@Injectable()
export class EmployeeShiftReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Completed-sales totals per shift, in one query. */
  private async salesByShift(
    shiftIds: string[],
  ): Promise<Map<string, { sales: Prisma.Decimal; count: number }>> {
    if (shiftIds.length === 0) return new Map();
    const rows = await this.prisma.transaction.groupBy({
      by: ['shiftId'],
      where: { shiftId: { in: shiftIds }, status: 'completed' },
      _sum: { grandTotal: true },
      _count: { id: true },
    });
    return new Map(
      rows
        .filter((r) => r.shiftId !== null)
        .map((r) => [r.shiftId as string, { sales: money(r._sum.grandTotal), count: r._count.id }]),
    );
  }

  /**
   * Detailed shift report for one employee within a date range.
   */
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
      where: { employeeId, startedAt: { gte: from, lte: to } },
      select: { id: true, startedAt: true, endedAt: true, cashDifference: true },
      orderBy: { startedAt: 'asc' },
      take: MAX_REPORT_SHIFTS,
    });
    const sales = await this.salesByShift(shifts.map((s) => s.id));

    let totalHoursWorked = 0;
    let totalTransactions = 0;

    const shiftDetails: ShiftDetail[] = shifts.map((shift) => {
      const endTime = shift.endedAt;
      const durationHours = endTime ? (endTime.getTime() - shift.startedAt.getTime()) / HOUR_MS : 0;
      const shiftSales = sales.get(shift.id);

      totalHoursWorked += durationHours;
      totalTransactions += shiftSales?.count ?? 0;

      return {
        shiftId: shift.id,
        startTime: shift.startedAt.toISOString(),
        endTime: endTime ? endTime.toISOString() : null,
        duration: round2(durationHours),
        sales: toNumber(shiftSales?.sales),
        transactions: shiftSales?.count ?? 0,
        cashDifference: shift.cashDifference ? toNumber(shift.cashDifference) : null,
      };
    });

    const totalShifts = shifts.length;

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      totalShifts,
      totalHoursWorked: round2(totalHoursWorked),
      averageShiftDuration: totalShifts > 0 ? round2(totalHoursWorked / totalShifts) : 0,
      totalSales: toNumber(sumMoney([...sales.values()].map((s) => s.sales))),
      totalTransactions,
      cashVariance: toNumber(sumMoney(shifts.map((s) => s.cashDifference))),
      shifts: shiftDetails,
    };
  }

  /**
   * Shift summary for all active employees at an outlet: three queries total
   * (employees, shifts, sales groupBy) instead of one per employee.
   */
  async getAllEmployeeShiftSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeShiftSummary[]> {
    const employees = await this.prisma.employee.findMany({
      where: { outletId, isActive: true },
      select: { id: true, name: true },
    });
    if (employees.length === 0) return [];

    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        outletId,
        startedAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        employeeId: true,
        startedAt: true,
        endedAt: true,
        cashDifference: true,
      },
    });
    const sales = await this.salesByShift(shifts.map((s) => s.id));

    return employees.map((employee) => {
      const own = shifts.filter((s) => s.employeeId === employee.id);
      let totalHoursWorked = 0;
      let totalTransactions = 0;
      for (const shift of own) {
        if (shift.endedAt) {
          totalHoursWorked += (shift.endedAt.getTime() - shift.startedAt.getTime()) / HOUR_MS;
        }
        totalTransactions += sales.get(shift.id)?.count ?? 0;
      }

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalShifts: own.length,
        totalHoursWorked: round2(totalHoursWorked),
        totalSales: toNumber(sumMoney(own.map((s) => sales.get(s.id)?.sales))),
        totalTransactions,
        cashVariance: toNumber(sumMoney(own.map((s) => s.cashDifference))),
      };
    });
  }
}
