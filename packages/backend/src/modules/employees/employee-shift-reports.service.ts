import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EmployeeShiftReport, EmployeeShiftSummary, ShiftDetail } from './employee.types';

/**
 * Service responsible for generating shift reports and summaries for employees.
 * Handles shift data aggregation, sales calculations, and performance metrics.
 */
@Injectable()
export class EmployeeShiftReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get detailed shift report for a specific employee within a date range.
   * Includes individual shift details with sales, transactions, and cash variance.
   *
   * @param employeeId - Employee ID
   * @param from - Start date
   * @param to - End date
   * @returns Detailed shift report with aggregated metrics
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

  /**
   * Get shift summary for all active employees at an outlet within a date range.
   * Provides aggregated metrics without individual shift details.
   *
   * @param outletId - Outlet ID
   * @param from - Start date
   * @param to - End date
   * @returns Array of employee shift summaries
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
}
