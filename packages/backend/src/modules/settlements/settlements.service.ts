import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '@shared/tenant';
import { toPrismaPage } from '@shared/dtos/pagination-query.dto';
import { parseBusinessDate } from '@shared/utils/business-time';
import { money, sumMoney, toNumber } from '@shared/utils/money';
import type {
  CreateSettlementDto,
  ListSettlementsQueryDto,
  ReconciliationQueryDto,
} from './dto/settlement.dto';

const SETTLEMENT_INCLUDE = {
  outlet: { select: { id: true, name: true, businessId: true } },
} as const;

type SettlementWithOutlet = Prisma.PaymentSettlementGetPayload<{
  include: typeof SETTLEMENT_INCLUDE;
}>;

/** `YYYY-MM-DD` → the `@db.Date` value stored in payment_settlements.settlement_date. */
function dateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function parseRange(startDate: string, endDate: string): { start: Date; end: Date } {
  try {
    const start = parseBusinessDate(startDate).start;
    const end = parseBusinessDate(endDate).end;
    if (start > end) throw new Error('startDate must be <= endDate');
    return { start, end };
  } catch (error) {
    throw new BadRequestException(error instanceof Error ? error.message : 'Invalid date range');
  }
}

/**
 * Settlement listing, reconciliation and manual confirmation. Every query is
 * scoped to the caller's business (R3); status transitions are conditional
 * (pending → settled | disputed) and audited (R9).
 */
@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  async list(user: AuthUser, query: ListSettlementsQueryDto) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    const where: Prisma.PaymentSettlementWhereInput = {
      outletId: { in: outletIds },
      outlet: { businessId: user.businessId },
      ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            settlementDate: {
              ...(query.dateFrom ? { gte: dateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: dateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    // The web client expects a plain array; the page is bounded by page/limit (R13).
    const settlements = await this.prisma.paymentSettlement.findMany({
      where,
      include: SETTLEMENT_INCLUDE,
      orderBy: [{ settlementDate: 'desc' }, { paymentMethod: 'asc' }],
      ...toPrismaPage(query),
    });
    return settlements.map((s) => this.toView(s));
  }

  async get(user: AuthUser, id: string) {
    const settlement = await this.prisma.paymentSettlement.findFirst({
      where: { id, outlet: { businessId: user.businessId } },
      include: SETTLEMENT_INCLUDE,
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return this.toView(settlement);
  }

  async reconciliation(user: AuthUser, query: ReconciliationQueryDto) {
    const { start, end } = parseRange(query.startDate, query.endDate);
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    const txScope: Prisma.TransactionWhereInput = {
      outletId: { in: outletIds },
      outlet: { businessId: user.businessId },
      createdAt: { gte: start, lte: end },
    };
    const salesWhere: Prisma.TransactionWhereInput = {
      ...txScope,
      transactionType: 'sale',
      status: { in: ['completed', 'partially_refunded', 'refunded'] },
    };
    const refundsWhere: Prisma.TransactionWhereInput = {
      ...txScope,
      transactionType: 'refund',
      status: { not: 'voided' },
    };

    const [sales, refunds, paymentsByMethod, refundPaymentsByMethod, settlements, unmatched] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: salesWhere,
          _sum: { grandTotal: true },
          _count: { _all: true },
        }),
        this.prisma.transaction.aggregate({
          where: refundsWhere,
          _sum: { grandTotal: true },
          _count: { _all: true },
        }),
        this.prisma.payment.groupBy({
          by: ['paymentMethod'],
          where: { status: 'completed', transaction: salesWhere },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.payment.groupBy({
          by: ['paymentMethod'],
          where: { status: 'completed', transaction: refundsWhere },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.paymentSettlement.groupBy({
          by: ['status'],
          where: {
            outletId: { in: outletIds },
            outlet: { businessId: user.businessId },
            settlementDate: {
              gte: dateOnly(query.startDate),
              lte: dateOnly(query.endDate),
            },
          },
          _sum: { grossAmount: true, netAmount: true },
          _count: { _all: true },
        }),
        this.prisma.transaction.findMany({
          where: { ...salesWhere, payments: { none: { status: 'completed' } } },
          select: { id: true, receiptNumber: true, grandTotal: true },
          orderBy: { createdAt: 'asc' },
          take: 100,
        }),
      ]);

    const totalSalesAmount = money(sales._sum.grandTotal);
    const totalRefundsAmount = money(refunds._sum.grandTotal).abs();
    const netTransactionsAmount = totalSalesAmount.minus(totalRefundsAmount);

    const refundByMethod = new Map(
      refundPaymentsByMethod.map((r) => [r.paymentMethod, money(r._sum.amount)]),
    );
    const byMethod = paymentsByMethod.map((p) => ({
      method: p.paymentMethod,
      count: p._count._all,
      total: toNumber(money(p._sum.amount).minus(refundByMethod.get(p.paymentMethod) ?? 0)),
    }));
    for (const [method, amount] of refundByMethod) {
      if (!paymentsByMethod.some((p) => p.paymentMethod === method)) {
        byMethod.push({ method, count: 0, total: toNumber(amount.negated()) });
      }
    }
    // Payments net of refunds; includes change handed back in cash (see settlement totals).
    const totalPaymentsReceived = sumMoney(byMethod.map((m) => m.total));

    const countOf = (status: SettlementStatus) =>
      settlements.find((s) => s.status === status)?._count._all ?? 0;
    const totalSettledGross = sumMoney(settlements.map((s) => s._sum.grossAmount));
    const totalSettledNet = sumMoney(settlements.map((s) => s._sum.netAmount));

    const transactionVsPaymentDiff = netTransactionsAmount.minus(totalPaymentsReceived);
    const paymentVsSettlementDiff = totalPaymentsReceived.minus(totalSettledGross);

    return {
      dateRange: { startDate: start.toISOString(), endDate: end.toISOString() },
      transactions: {
        salesCount: sales._count._all,
        refundsCount: refunds._count._all,
        totalSalesAmount: toNumber(totalSalesAmount),
        totalRefundsAmount: toNumber(totalRefundsAmount),
        netTransactionsAmount: toNumber(netTransactionsAmount),
      },
      payments: {
        totalPaymentsReceived: toNumber(totalPaymentsReceived),
        byMethod,
      },
      settlements: {
        totalSettlements: settlements.reduce((n, s) => n + s._count._all, 0),
        settledCount: countOf('settled'),
        pendingCount: countOf('pending'),
        disputedCount: countOf('disputed'),
        totalSettledGross: toNumber(totalSettledGross),
        totalSettledNet: toNumber(totalSettledNet),
      },
      discrepancies: {
        transactionVsPaymentDiff: toNumber(transactionVsPaymentDiff),
        paymentVsSettlementDiff: toNumber(paymentVsSettlementDiff),
        hasDiscrepancy: transactionVsPaymentDiff.abs().gt(1) || paymentVsSettlementDiff.abs().gt(1),
      },
      unmatchedPayments: unmatched.map((t) => ({
        transactionId: t.id,
        receiptNumber: t.receiptNumber,
        amount: toNumber(t.grandTotal),
        issue: 'No payment record found',
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async create(user: AuthUser, dto: CreateSettlementDto) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId);
    const gross = money(dto.grossAmount);
    const fee = money(dto.feeAmount);
    const net = money(dto.netAmount);
    if (fee.gt(gross)) {
      throw new BadRequestException('feeAmount cannot exceed grossAmount');
    }
    if (!gross.minus(fee).equals(net)) {
      throw new BadRequestException('netAmount must equal grossAmount - feeAmount');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.paymentSettlement.create({
          data: {
            outletId,
            paymentMethod: dto.paymentMethod,
            settlementDate: dateOnly(dto.settlementDate),
            totalTransactions: dto.totalTransactions,
            grossAmount: gross,
            feeAmount: fee,
            netAmount: net,
            referenceNumber: dto.referenceNumber ?? null,
            metadata: { source: 'manual', createdBy: user.employeeId },
          },
        });
        await tx.auditLog.create({
          data: {
            businessId: user.businessId,
            outletId,
            employeeId: user.employeeId,
            action: 'settlement_created',
            entityType: 'payment_settlement',
            entityId: created.id,
            newValue: {
              paymentMethod: dto.paymentMethod,
              settlementDate: dto.settlementDate,
              grossAmount: gross.toString(),
              feeAmount: fee.toString(),
              netAmount: net.toString(),
            },
          },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'A settlement for this outlet, date and payment method already exists',
        );
      }
      throw error;
    }
  }

  async settle(user: AuthUser, id: string, notes?: string) {
    return this.transition(user, id, 'settled', {
      settledBy: user.employeeId,
      ...(notes ? { notes } : {}),
    });
  }

  async dispute(user: AuthUser, id: string, reason?: string) {
    return this.transition(user, id, 'disputed', {
      disputedBy: user.employeeId,
      ...(reason ? { disputeReason: reason } : {}),
    });
  }

  /** pending → settled | disputed, scoped to the caller's business and audited. */
  private async transition(
    user: AuthUser,
    id: string,
    to: 'settled' | 'disputed',
    metaPatch: Record<string, string>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.paymentSettlement.findFirst({
        where: { id, outlet: { businessId: user.businessId } },
        select: { id: true, outletId: true, status: true, metadata: true },
      });
      if (!current) throw new NotFoundException('Settlement not found');

      const existingMeta =
        current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
          ? (current.metadata as Prisma.JsonObject)
          : {};

      const { count } = await tx.paymentSettlement.updateMany({
        where: { id, outlet: { businessId: user.businessId }, status: 'pending' },
        data: {
          status: to,
          ...(to === 'settled' ? { settledAt: new Date() } : {}),
          metadata: { ...existingMeta, ...metaPatch },
        },
      });
      if (count === 0) {
        throw new ConflictException(`Settlement is already ${current.status}`);
      }

      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          outletId: current.outletId,
          employeeId: user.employeeId,
          action: to === 'settled' ? 'settlement_settled' : 'settlement_disputed',
          entityType: 'payment_settlement',
          entityId: id,
          oldValue: { status: current.status },
          newValue: { status: to, ...metaPatch },
        },
      });

      return tx.paymentSettlement.findFirstOrThrow({
        where: { id, outlet: { businessId: user.businessId } },
      });
    });
  }

  private toView(s: SettlementWithOutlet) {
    const meta =
      s.metadata && typeof s.metadata === 'object' && !Array.isArray(s.metadata)
        ? (s.metadata as Record<string, unknown>)
        : {};
    const grossAmount = toNumber(s.grossAmount);
    const netAmount = toNumber(s.netAmount);
    const isCash = s.paymentMethod === 'cash';

    return {
      id: s.id,
      date: s.settlementDate.toISOString(),
      outletId: s.outletId,
      outletName: s.outlet.name,
      paymentMethod: s.paymentMethod,
      totalSales: grossAmount,
      feeAmount: toNumber(s.feeAmount),
      netAmount,
      cashAmount: isCash ? grossAmount : 0,
      nonCashAmount: isCash ? 0 : grossAmount,
      settledAmount: s.status === 'settled' ? netAmount : 0,
      status: s.status,
      paymentBreakdown: [
        { method: s.paymentMethod, amount: grossAmount, transactionCount: s.totalTransactions },
      ],
      notes: typeof meta.notes === 'string' ? meta.notes : null,
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      settledBy: typeof meta.settledBy === 'string' ? meta.settledBy : null,
      businessId: s.outlet.businessId,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
