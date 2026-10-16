import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { money, roundRupiah, toNumber } from '../../shared/utils/money';
import {
  EmployeeCommission,
  EmployeeCommissionSummary,
  TransactionCommission,
} from './employee.types';
import { COMMISSION_RATES, DEFAULT_COMMISSION_RATE } from './employee.constants';

/** Hard cap on per-transaction rows in one commission report. */
const MAX_COMMISSION_ROWS = 2000;

/**
 * Commission rate for a role. A business may override the defaults with
 * `business.settings.commissionRates = { cashier: 0.02, ... }` (fractions, 0-1).
 */
export function resolveCommissionRate(role: string, settings: Prisma.JsonValue | null): number {
  const overrides =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>).commissionRates
      : undefined;
  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    const value = (overrides as Record<string, unknown>)[role];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) {
      return value;
    }
  }
  return COMMISSION_RATES[role] ?? DEFAULT_COMMISSION_RATE;
}

/**
 * Service responsible for calculating employee commissions.
 * All money arithmetic uses Prisma.Decimal and is rounded to whole rupiah.
 */
@Injectable()
export class EmployeeCommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detailed commission report for one employee (per-transaction breakdown
   * capped at MAX_COMMISSION_ROWS; totals come from a DB aggregate).
   */
  async getEmployeeCommissions(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeCommission> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, role: true, business: { select: { settings: true } } },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const commissionRate = resolveCommissionRate(employee.role, employee.business.settings);
    const where: Prisma.TransactionWhereInput = {
      employeeId,
      status: 'completed',
      transactionType: 'sale',
      createdAt: { gte: from, lte: to },
    };

    const [transactions, totals] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        select: { id: true, grandTotal: true },
        orderBy: { createdAt: 'asc' },
        take: MAX_COMMISSION_ROWS,
      }),
      this.prisma.transaction.aggregate({ where, _sum: { grandTotal: true } }),
    ]);

    const transactionCommissions: TransactionCommission[] = transactions.map((t) => ({
      transactionId: t.id,
      amount: toNumber(t.grandTotal),
      commission: toNumber(roundRupiah(money(t.grandTotal).times(commissionRate))),
    }));

    const totalSales = money(totals._sum.grandTotal);

    return {
      employeeId,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totalSales: toNumber(totalSales),
      commissionRate,
      commissionAmount: toNumber(roundRupiah(totalSales.times(commissionRate))),
      transactions: transactionCommissions,
    };
  }

  /**
   * Commission summary for all active employees at an outlet — one groupBy
   * instead of an aggregate per employee.
   */
  async getAllEmployeeCommissionSummary(
    outletId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeCommissionSummary[]> {
    const employees = await this.prisma.employee.findMany({
      where: { outletId, isActive: true },
      select: { id: true, name: true, role: true, business: { select: { settings: true } } },
    });
    if (employees.length === 0) return [];

    const grouped = await this.prisma.transaction.groupBy({
      by: ['employeeId'],
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        status: 'completed',
        transactionType: 'sale',
        createdAt: { gte: from, lte: to },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    });
    const byEmployee = new Map(grouped.map((g) => [g.employeeId, g]));

    return employees.map((employee) => {
      const commissionRate = resolveCommissionRate(employee.role, employee.business.settings);
      const row = byEmployee.get(employee.id);
      const totalSales = money(row?._sum.grandTotal);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalSales: toNumber(totalSales),
        commissionRate,
        commissionAmount: toNumber(roundRupiah(totalSales.times(commissionRate))),
        transactionCount: row?._count.id ?? 0,
      };
    });
  }
}
