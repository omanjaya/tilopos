import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type Payment } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { money, sumMoney } from '@shared/utils/money';

/** What a gateway notification means for our Payment row. */
export type WebhookOutcome = 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'pending';

export interface WebhookNotification {
  provider: 'midtrans' | 'xendit';
  /** order_id / external_id / reference_id sent by us (the Payment id). */
  reference: string;
  outcome: WebhookOutcome;
  /** Amount reported by the gateway (paid / refunded amount). */
  amount: string | number | null;
  /** Gateway-side id / event for the audit trail. */
  gatewayRef?: string | null;
  event?: string | null;
}

export type WebhookResultCode =
  | 'applied'
  | 'duplicate'
  | 'ignored'
  | 'amount_mismatch'
  | 'not_found';

export interface WebhookProcessResult {
  code: WebhookResultCode;
  paymentId: string | null;
  message: string;
}

type PaymentWithTx = Payment & {
  transaction: {
    id: string;
    outletId: string;
    grandTotal: Prisma.Decimal;
    outlet: { businessId: string };
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAYMENT_INCLUDE = {
  transaction: {
    select: {
      id: true,
      outletId: true,
      grandTotal: true,
      outlet: { select: { businessId: true } },
    },
  },
} as const;

/**
 * Shared, gateway-agnostic application of a verified payment notification
 * (Docs/ENGINEERING-RULES.md R8/R9):
 * - the payment is located by our own id (the order/external id we sent),
 *   never by prefix-stripping or free-text matching;
 * - the paid amount must equal Payment.amount, otherwise nothing is completed;
 * - state changes are conditional updates (pending|failed -> completed,
 *   pending -> failed, completed -> refunded), so duplicate or out-of-order
 *   deliveries are no-ops;
 * - the transaction is completed only once all of its payments are completed
 *   and cover the grand total; a failed/expired payment never voids the sale.
 */
@Injectable()
export class PaymentWebhookProcessor {
  private readonly logger = new Logger(PaymentWebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(n: WebhookNotification): Promise<WebhookProcessResult> {
    const payment = await this.findPayment(n.reference);
    if (!payment) {
      this.logger.error(`${n.provider} notification for unknown payment reference ${n.reference}`);
      return { code: 'not_found', paymentId: null, message: 'Payment not found' };
    }

    switch (n.outcome) {
      case 'pending':
        return { code: 'ignored', paymentId: payment.id, message: 'Pending notification ignored' };
      case 'completed':
        return this.complete(payment, n);
      case 'failed':
        return this.fail(payment, n);
      case 'refunded':
        return this.refund(payment, n);
      case 'partially_refunded':
        return this.recordPartialRefund(payment, n);
    }
  }

  async findPayment(reference: string): Promise<PaymentWithTx | null> {
    if (!reference) return null;
    if (UUID_RE.test(reference)) {
      const byId = await this.prisma.payment.findFirst({
        where: { id: reference },
        include: PAYMENT_INCLUDE,
      });
      if (byId) return byId;
    }
    // Fallback for charges created before references were the payment id:
    // exact match on the stored gateway reference only; ambiguity is refused.
    const matches = await this.prisma.payment.findMany({
      where: {
        OR: [
          { referenceNumber: reference },
          { metadata: { path: ['gatewayRef'], equals: reference } },
          { metadata: { path: ['gatewayOrderId'], equals: reference } },
        ],
      },
      include: PAYMENT_INCLUDE,
      take: 2,
    });
    if (matches.length > 1) {
      this.logger.error(`Ambiguous payment reference ${reference}; refusing to guess`);
      return null;
    }
    return matches[0] ?? null;
  }

  private amountMatches(payment: Payment, amount: string | number | null): boolean {
    if (amount === null || amount === undefined || amount === '') return false;
    try {
      return money(amount).equals(money(payment.amount));
    } catch {
      // intentionally ignored: a non-numeric amount is treated as a mismatch below
      this.logger.warn(`Non-numeric gateway amount "${String(amount)}" for payment ${payment.id}`);
      return false;
    }
  }

  private async complete(
    payment: PaymentWithTx,
    n: WebhookNotification,
  ): Promise<WebhookProcessResult> {
    if (payment.status === 'completed' || payment.status === 'refunded') {
      return { code: 'duplicate', paymentId: payment.id, message: 'Already processed' };
    }

    if (!this.amountMatches(payment, n.amount)) {
      await this.flagAmountMismatch(payment, n);
      return {
        code: 'amount_mismatch',
        paymentId: payment.id,
        message: 'Amount does not match the payment; not completed',
      };
    }

    const applied = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['pending', 'failed'] } },
        data: {
          status: 'completed',
          metadata: this.mergeMetadata(payment, {
            confirmedBy: n.provider,
            confirmedAt: new Date().toISOString(),
            ...(n.gatewayRef ? { gatewayPaymentRef: n.gatewayRef } : {}),
            ...(payment.status === 'failed' ? { paidAfterFailure: true } : {}),
          }),
        },
      });
      if (count === 0) return false;

      if (payment.status === 'failed') {
        this.logger.error(
          `Payment ${payment.id} was paid after being marked failed; completed for reconciliation`,
        );
      }

      const payments = await tx.payment.findMany({
        where: { transactionId: payment.transactionId },
        select: { status: true, amount: true },
      });
      const allCompleted = payments.every((p) => p.status === 'completed');
      const paid = sumMoney(payments.filter((p) => p.status === 'completed').map((p) => p.amount));
      if (allCompleted && paid.gte(money(payment.transaction.grandTotal))) {
        await tx.transaction.updateMany({
          where: { id: payment.transactionId, status: { in: ['pending', 'partially_paid'] } },
          data: { status: 'completed' },
        });
      }
      return true;
    });

    return applied
      ? { code: 'applied', paymentId: payment.id, message: 'Payment completed' }
      : { code: 'duplicate', paymentId: payment.id, message: 'Already processed' };
  }

  private async fail(
    payment: PaymentWithTx,
    n: WebhookNotification,
  ): Promise<WebhookProcessResult> {
    // Only a pending payment can fail; a late "expired" after "paid" is ignored.
    const { count } = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        status: 'failed',
        metadata: this.mergeMetadata(payment, {
          failedBy: n.provider,
          failedEvent: n.event ?? null,
          failedAt: new Date().toISOString(),
        }),
      },
    });
    return count === 1
      ? { code: 'applied', paymentId: payment.id, message: 'Payment marked failed' }
      : { code: 'duplicate', paymentId: payment.id, message: 'No pending payment to fail' };
  }

  private async refund(
    payment: PaymentWithTx,
    n: WebhookNotification,
  ): Promise<WebhookProcessResult> {
    // A refund smaller than the payment is partial: never mark the payment refunded.
    if (n.amount !== null && n.amount !== '' && money(n.amount).lt(money(payment.amount))) {
      return this.recordPartialRefund(payment, n);
    }
    // Payment-level full refund only; the sale's status is owned by the refund use-case.
    const { count } = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'completed' },
      data: {
        status: 'refunded',
        metadata: this.mergeMetadata(payment, {
          refundedBy: n.provider,
          refundedAt: new Date().toISOString(),
          refundedAmount: n.amount === null ? null : String(n.amount),
        }),
      },
    });
    return count === 1
      ? { code: 'applied', paymentId: payment.id, message: 'Payment refunded' }
      : { code: 'duplicate', paymentId: payment.id, message: 'No completed payment to refund' };
  }

  private async recordPartialRefund(
    payment: PaymentWithTx,
    n: WebhookNotification,
  ): Promise<WebhookProcessResult> {
    const existing = this.metadataObject(payment);
    const refunds = Array.isArray(existing.gatewayRefunds) ? existing.gatewayRefunds : [];
    const key = `${n.gatewayRef ?? ''}:${String(n.amount)}`;
    if (refunds.some((r) => (r as Record<string, unknown>)?.key === key)) {
      return {
        code: 'duplicate',
        paymentId: payment.id,
        message: 'Partial refund already recorded',
      };
    }
    await this.prisma.payment.updateMany({
      where: { id: payment.id },
      data: {
        metadata: this.mergeMetadata(payment, {
          gatewayRefunds: [
            ...refunds,
            {
              key,
              amount: n.amount === null ? null : String(n.amount),
              at: new Date().toISOString(),
            },
          ],
        }),
      },
    });
    return { code: 'applied', paymentId: payment.id, message: 'Partial refund recorded' };
  }

  private async flagAmountMismatch(payment: PaymentWithTx, n: WebhookNotification): Promise<void> {
    const received = n.amount === null ? null : String(n.amount);
    this.logger.error(
      `${n.provider} amount mismatch for payment ${payment.id}: expected ${payment.amount.toString()}, got ${received}`,
    );
    await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: {
          metadata: this.mergeMetadata(payment, {
            amountMismatch: {
              expected: payment.amount.toString(),
              received,
              provider: n.provider,
              at: new Date().toISOString(),
            },
          }),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          businessId: payment.transaction.outlet.businessId,
          outletId: payment.transaction.outletId,
          action: 'payment_amount_mismatch',
          entityType: 'payment',
          entityId: payment.id,
          newValue: { expected: payment.amount.toString(), received, provider: n.provider },
        },
      }),
    ]);
  }

  private metadataObject(payment: Payment): Record<string, unknown> {
    const m = payment.metadata;
    return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
  }

  private mergeMetadata(payment: Payment, patch: Record<string, unknown>): Prisma.InputJsonValue {
    return { ...this.metadataObject(payment), ...patch } as Prisma.InputJsonValue;
  }
}
