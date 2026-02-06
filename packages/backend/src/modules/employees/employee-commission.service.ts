import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  EmployeeCommission,
  EmployeeCommissionSummary,
  TransactionCommission,
} from './employee.types';
import { COMMISSION_RATES, DEFAULT_COMMISSION_RATE } from './employee.constants';

/**
 * Service responsible for calculating employee commissions.
 * Handles commission calculations based on sales performance and employee role.
 */
@Injectable()
export class EmployeeCommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get detailed commission report for a specific employee within a date range.
   * Includes per-transaction commission breakdown.
   *
   * @param employeeId - Employee ID
   * @param from - Start date
   * @param to - End date
   * @returns Detailed commission report
   */
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

  /**
   * Get commission summary for all active employees at an outlet within a date range.
   * Provides aggregated commission metrics without per-transaction details.
   *
   * @param outletId - Outlet ID
   * @param from - Start date
   * @param to - End date
   * @returns Array of employee commission summaries
   */
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
}
