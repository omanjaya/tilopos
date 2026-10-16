import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { businessDayRange, businessDateKey } from '@shared/utils/business-time';
import { money, roundRupiah, percentOf, type MoneyInput } from '@shared/utils/money';

export interface AutoSettleParams {
  outletId: string;
  businessId: string;
  /** Any instant inside the business day (Asia/Jakarta) to settle. Default: now. */
  settlementDate?: Date;
}

export interface AutoSettleResult {
  settlementId: string;
  paymentMethod: string;
  /** false when an existing non-pending settlement was left untouched. */
  updated: boolean;
}

/**
 * Default MDR (merchant discount rate) per PaymentMethod enum value, as a
 * fraction. Keys MUST match `PaymentMethod` (payments.payment_method).
 */
export const SETTLEMENT_FEE_RATES: Record<string, number> = {
  cash: 0,
  card: 0.025,
  debit_card: 0.01,
  credit_card: 0.025,
  qris: 0.007,
  gopay: 0.02,
  ovo: 0.02,
  dana: 0.015,
  shopeepay: 0.015,
  linkaja: 0.015,
  bank_transfer: 0,
  credit_note: 0,
};

export interface SettlementPaymentRow {
  paymentMethod: string;
  amount: MoneyInput;
}

export interface SettlementSaleRow {
  id: string;
  grandTotal: MoneyInput;
  payments: SettlementPaymentRow[];
}

export interface SettlementRefundRow {
  id: string;
  payments: SettlementPaymentRow[];
}

interface SettlementData {
  totalTransactions: number;
  grossAmount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  metadata: Prisma.InputJsonObject;
}

export interface MethodTotal {
  paymentMethod: string;
  totalTransactions: number;
  salesAmount: Prisma.Decimal;
  refundAmount: Prisma.Decimal;
  creditRepaymentAmount: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
}

/**
 * Per-method settlement totals (pure, unit-tested).
 * - A sale contributes each completed payment's own amount to its method
 *   (split payments are never counted twice).
 * - Change (paid - grandTotal) is returned in cash, so it is deducted from cash.
 * - Refund transactions subtract their payment amounts per method.
 * - Credit repayments received that day are added per method.
 */
export function computeSettlementTotals(
  sales: SettlementSaleRow[],
  refunds: SettlementRefundRow[],
  creditRepayments: SettlementPaymentRow[] = [],
): MethodTotal[] {
  const totals = new Map<
    string,
    { sales: Prisma.Decimal; refunds: Prisma.Decimal; credit: Prisma.Decimal; txIds: Set<string> }
  >();
  const bucket = (method: string) => {
    let b = totals.get(method);
    if (!b) {
      b = { sales: money(0), refunds: money(0), credit: money(0), txIds: new Set() };
      totals.set(method, b);
    }
    return b;
  };

  for (const sale of sales) {
    let paid = money(0);
    let cashPaid = money(0);
    for (const p of sale.payments) {
      const b = bucket(p.paymentMethod);
      b.sales = b.sales.plus(money(p.amount));
      b.txIds.add(sale.id);
      paid = paid.plus(money(p.amount));
      if (p.paymentMethod === 'cash') cashPaid = cashPaid.plus(money(p.amount));
    }
    const change = paid.minus(money(sale.grandTotal));
    if (change.gt(0) && cashPaid.gt(0)) {
      const cash = bucket('cash');
      cash.sales = cash.sales.minus(Prisma.Decimal.min(change, cashPaid));
    }
  }

  for (const refund of refunds) {
    for (const p of refund.payments) {
      const b = bucket(p.paymentMethod);
      b.refunds = b.refunds.plus(money(p.amount));
      b.txIds.add(refund.id);
    }
  }

  for (const p of creditRepayments) {
    const b = bucket(p.paymentMethod);
    b.credit = b.credit.plus(money(p.amount));
  }

  return [...totals.entries()]
    .map(([paymentMethod, b]) => {
      const grossAmount = b.sales.minus(b.refunds).plus(b.credit);
      const rate = SETTLEMENT_FEE_RATES[paymentMethod] ?? 0;
      const feeAmount = grossAmount.gt(0)
        ? roundRupiah(percentOf(grossAmount, rate * 100))
        : money(0);
      return {
        paymentMethod,
        totalTransactions: b.txIds.size,
        salesAmount: b.sales,
        refundAmount: b.refunds,
        creditRepaymentAmount: b.credit,
        grossAmount,
        feeAmount,
        netAmount: grossAmount.minus(feeAmount),
      };
    })
    .sort((a, b) => a.paymentMethod.localeCompare(b.paymentMethod));
}

/** `@db.Date` value (UTC midnight) of the business (WIB) calendar day of `date`. */
export function settlementDateOf(date: Date): Date {
  const key = businessDateKey(date);
  return new Date(
    Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8))),
  );
}

/**
 * Creates (or refreshes, while still pending) one PaymentSettlement per payment
 * method for an outlet's business day. Idempotent via the unique
 * (outletId, settlementDate, paymentMethod) key, so cron re-runs, retries and
 * multiple replicas never duplicate rows (R9).
 */
@Injectable()
export class AutoSettlementUseCase {
  private readonly logger = new Logger(AutoSettlementUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(params: AutoSettleParams): Promise<AutoSettleResult[]> {
    const day = params.settlementDate ?? new Date();
    const { start, end } = businessDayRange(day);
    const settlementDate = settlementDateOf(day);
    const outletScope = { outletId: params.outletId, outlet: { businessId: params.businessId } };

    const [sales, refunds, creditRepayments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          ...outletScope,
          transactionType: 'sale',
          // Refunded sales still took the money that day; their refund transactions subtract it.
          status: { in: ['completed', 'partially_refunded', 'refunded'] },
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          grandTotal: true,
          payments: {
            where: { status: 'completed' },
            select: { paymentMethod: true, amount: true },
          },
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          ...outletScope,
          transactionType: 'refund',
          status: { not: 'voided' },
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          payments: {
            where: { status: 'completed' },
            select: { paymentMethod: true, amount: true },
          },
        },
      }),
      this.prisma.creditPayment.findMany({
        where: {
          creditSale: outletScope,
          createdAt: { gte: start, lte: end },
        },
        select: { paymentMethod: true, amount: true },
      }),
    ]);

    for (const refund of refunds) {
      if (refund.payments.length === 0) {
        this.logger.warn(
          `Refund ${refund.id} at outlet ${params.outletId} has no payment rows; not deducted from settlement`,
        );
      }
    }

    const totals = computeSettlementTotals(sales, refunds, creditRepayments);
    const results: AutoSettleResult[] = [];

    for (const t of totals) {
      const key = {
        outletId: params.outletId,
        settlementDate,
        paymentMethod: t.paymentMethod,
      };
      const data: SettlementData = {
        totalTransactions: t.totalTransactions,
        grossAmount: t.grossAmount,
        feeAmount: t.feeAmount,
        netAmount: t.netAmount,
        metadata: {
          salesAmount: t.salesAmount.toString(),
          refundAmount: t.refundAmount.toString(),
          creditRepaymentAmount: t.creditRepaymentAmount.toString(),
          feeRate: SETTLEMENT_FEE_RATES[t.paymentMethod] ?? 0,
          generatedAt: new Date().toISOString(),
        },
      };
      results.push(await this.upsertPending(key, data));
    }

    return results;
  }

  /**
   * Creates the row, or refreshes it only while it is still `pending`
   * (a settled/disputed row is never overwritten). Safe under concurrent runs:
   * the unique key turns a racing create into P2002, which falls back to the
   * conditional update.
   */
  private async upsertPending(
    key: { outletId: string; settlementDate: Date; paymentMethod: string },
    data: SettlementData,
  ): Promise<AutoSettleResult> {
    const existing = await this.prisma.paymentSettlement.findUnique({
      where: { outletId_settlementDate_paymentMethod: key },
      select: { id: true },
    });

    if (!existing) {
      try {
        const created = await this.prisma.paymentSettlement.create({
          data: { ...key, ...data, status: 'pending', referenceNumber: null },
          select: { id: true },
        });
        return { settlementId: created.id, paymentMethod: key.paymentMethod, updated: true };
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
        // Another run created it concurrently: fall through to the conditional update.
      }
    }

    const { count } = await this.prisma.paymentSettlement.updateMany({
      where: { ...key, status: 'pending' },
      data,
    });
    const row = await this.prisma.paymentSettlement.findUniqueOrThrow({
      where: { outletId_settlementDate_paymentMethod: key },
      select: { id: true },
    });
    return { settlementId: row.id, paymentMethod: key.paymentMethod, updated: count === 1 };
  }
}
