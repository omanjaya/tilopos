import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { SERVICE_TOKENS } from '@infrastructure/services/service.tokens';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IPaymentGateway, PaymentResult } from '@domain/interfaces/services/payment-gateway';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { money, sumMoney, nonNegative } from '@shared/utils/money';

export interface MultiPaymentInput {
  transactionId: string;
  businessId: string;
  payments: {
    method: string;
    amount: number;
    referenceNumber?: string;
  }[];
  /** Client retry key: a replay returns the payments of the first request. */
  idempotencyKey?: string;
}

export type PaymentRecordStatus = 'pending' | 'completed' | 'failed';

export interface MultiPaymentOutput {
  transactionId: string;
  totalPaid: number;
  change: number;
  transactionStatus: string;
  paymentRecords: {
    paymentId: string;
    method: string;
    amount: number;
    /** Non-cash payments stay `pending` until the gateway confirms them (webhook). */
    status: PaymentRecordStatus;
    paymentData?: Record<string, unknown>;
    message?: string;
  }[];
}

/** Transactions that still expect money. */
const PAYABLE_STATUSES = ['pending', 'partially_paid'] as const;

/**
 * Adds payments to an unpaid transaction (R8/R9):
 * 1. Under a row lock, validate status/outstanding and record the payments
 *    (cash `completed`, gateway methods `pending`).
 * 2. Outside the DB transaction, ask the gateway for each non-cash payment and
 *    respect its answer; only a confirmed charge completes a payment, otherwise
 *    the webhook does it later.
 * 3. Re-derive the transaction status from confirmed payments (conditional update).
 */
@Injectable()
export class ProcessMultiPaymentUseCase {
  private readonly logger = new Logger(ProcessMultiPaymentUseCase.name);

  constructor(
    @Inject(SERVICE_TOKENS.PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: MultiPaymentInput): Promise<MultiPaymentOutput> {
    for (const p of input.payments) {
      if (p.method === 'credit_note') {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          'Credit note payments are not supported',
        );
      }
      if (!(p.amount > 0)) {
        throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Payment amount must be positive');
      }
    }

    const recorded = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT t.id FROM transactions t
          JOIN outlets o ON o.id = t.outlet_id
         WHERE t.id = ${input.transactionId}::uuid
           AND o.business_id = ${input.businessId}::uuid
         FOR UPDATE OF t`;
      if (locked.length === 0) throw new TransactionNotFoundException(input.transactionId);

      const transaction = await tx.transaction.findFirst({
        where: { id: input.transactionId, outlet: { businessId: input.businessId } },
        select: {
          id: true,
          status: true,
          grandTotal: true,
          payments: {
            select: { id: true, paymentMethod: true, amount: true, status: true, metadata: true },
          },
        },
      });
      if (!transaction) throw new TransactionNotFoundException(input.transactionId);

      if (input.idempotencyKey) {
        const replay = transaction.payments.filter(
          (p) =>
            (p.metadata as Record<string, unknown> | null)?.idempotencyKey === input.idempotencyKey,
        );
        if (replay.length > 0) return { kind: 'replay' as const, replay };
      }

      if (!(PAYABLE_STATUSES as readonly string[]).includes(transaction.status)) {
        throw new BusinessError(
          ErrorCode.INVALID_TRANSACTION,
          `Cannot add payments to transaction in status: ${transaction.status}`,
        );
      }

      // Money already collected or in flight counts against the grand total.
      const alreadyPaid = sumMoney(
        transaction.payments
          .filter((p) => p.status === 'completed' || p.status === 'pending')
          .map((p) => p.amount),
      );
      const outstanding = nonNegative(money(transaction.grandTotal).minus(alreadyPaid));
      const total = sumMoney(input.payments.map((p) => p.amount));
      if (total.lt(outstanding)) {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          `Total payments ${total.toString()} is less than the outstanding ${outstanding.toString()}`,
        );
      }
      const nonCash = sumMoney(
        input.payments.filter((p) => p.method !== 'cash').map((p) => p.amount),
      );
      if (nonCash.gt(outstanding)) {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          'Non-cash payments cannot exceed the outstanding amount (change is only given in cash)',
        );
      }

      const created = [];
      for (const p of input.payments) {
        const isCash = p.method === 'cash';
        created.push(
          await tx.payment.create({
            data: {
              transactionId: input.transactionId,
              paymentMethod: p.method as PaymentMethod,
              amount: money(p.amount),
              referenceNumber: p.referenceNumber || null,
              status: isCash ? 'completed' : 'pending',
              metadata: {
                source: isCash ? 'pos' : 'gateway',
                ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
              },
            },
            select: { id: true, paymentMethod: true, amount: true, status: true, metadata: true },
          }),
        );
      }
      return { kind: 'new' as const, created, outstanding };
    });

    if (recorded.kind === 'replay') {
      return this.summarize(
        input.transactionId,
        recorded.replay.map((p) => ({ ...p, message: 'replayed' })),
      );
    }

    const results: Array<{
      id: string;
      paymentMethod: PaymentMethod;
      amount: Prisma.Decimal;
      status: string;
      paymentData?: Record<string, unknown>;
      message?: string;
    }> = [];

    for (const payment of recorded.created) {
      if (payment.paymentMethod === 'cash') {
        results.push(payment);
        continue;
      }
      results.push(await this.chargeViaGateway(payment));
    }

    return this.summarize(input.transactionId, results, recorded.outstanding);
  }

  /** Calls the gateway for one pending payment and records exactly what it answered. */
  private async chargeViaGateway(payment: {
    id: string;
    paymentMethod: PaymentMethod;
    amount: Prisma.Decimal;
    metadata: Prisma.JsonValue;
  }) {
    const baseMeta = (payment.metadata ?? {}) as Record<string, unknown>;
    let result: PaymentResult;
    try {
      result = await this.paymentGateway.processPayment({
        method: payment.paymentMethod,
        amount: money(payment.amount).toNumber(),
        // Gateway order id == our Payment.id so the webhook can find it (unique, server-generated).
        referenceNumber: payment.id,
      });
    } catch (error) {
      // Outcome unknown (e.g. timeout): keep it pending for webhook/reconciliation.
      const message = (error as Error).message;
      this.logger.error(`Gateway call failed for payment ${payment.id}: ${message}`);
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { metadata: { ...baseMeta, gatewayOrderId: payment.id, gatewayError: message } },
      });
      return { ...payment, status: 'pending', message: 'Gateway did not answer; payment pending' };
    }

    const paymentData = result.paymentData ?? {};
    const gatewayStatus = paymentData.paymentStatus;
    // success=false with outcomeUnknown (timeout/5xx) may still have charged: keep pending
    // and let the webhook settle it. Only a confirmed 'completed' marks it paid.
    const status: PaymentRecordStatus = !result.success
      ? paymentData.outcomeUnknown === true || gatewayStatus === 'pending'
        ? 'pending'
        : 'failed'
      : gatewayStatus === 'completed'
        ? 'completed'
        : gatewayStatus === 'failed'
          ? 'failed'
          : 'pending';

    await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        status,
        referenceNumber: result.transactionRef ? result.transactionRef.slice(0, 100) : null,
        metadata: {
          ...baseMeta,
          gatewayOrderId: payment.id,
          gatewayRef: result.transactionRef ?? null,
          paymentData: paymentData as Prisma.InputJsonValue,
          ...(result.message ? { gatewayMessage: result.message } : {}),
        },
      },
    });
    return { ...payment, status, paymentData, message: result.message };
  }

  /** Derives the transaction status from confirmed payments and builds the response. */
  private async summarize(
    transactionId: string,
    records: Array<{
      id: string;
      paymentMethod: PaymentMethod;
      amount: Prisma.Decimal;
      status: string;
      paymentData?: Record<string, unknown>;
      message?: string;
    }>,
    outstandingBefore?: Prisma.Decimal,
  ): Promise<MultiPaymentOutput> {
    const txn = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      select: {
        status: true,
        grandTotal: true,
        payments: { where: { status: 'completed' }, select: { amount: true } },
      },
    });
    const confirmed = sumMoney(txn.payments.map((p) => p.amount));
    const grandTotal = money(txn.grandTotal);

    let status: string = txn.status;
    if ((PAYABLE_STATUSES as readonly string[]).includes(txn.status)) {
      const next = confirmed.gte(grandTotal)
        ? 'completed'
        : confirmed.gt(0)
          ? 'partially_paid'
          : txn.status;
      if (next !== txn.status) {
        const { count } = await this.prisma.transaction.updateMany({
          where: { id: transactionId, status: { in: [...PAYABLE_STATUSES] } },
          data: { status: next as 'completed' | 'partially_paid' },
        });
        if (count === 1) status = next;
      }
    }

    const totalPaid = sumMoney(records.map((r) => r.amount));
    const change = outstandingBefore ? nonNegative(totalPaid.minus(outstandingBefore)) : money(0);

    return {
      transactionId,
      totalPaid: totalPaid.toNumber(),
      change: change.toNumber(),
      transactionStatus: status,
      paymentRecords: records.map((r) => ({
        paymentId: r.id,
        method: r.paymentMethod,
        amount: money(r.amount).toNumber(),
        status: (['pending', 'completed', 'failed'].includes(r.status)
          ? r.status
          : 'completed') as PaymentRecordStatus,
        ...(r.paymentData ? { paymentData: r.paymentData } : {}),
        ...(r.message ? { message: r.message } : {}),
      })),
    };
  }
}
