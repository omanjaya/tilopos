import { Injectable, Logger } from '@nestjs/common';
import { AUDIT_ACTIONS } from '@modules/audit/audit-actions';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TransactionVoidedEvent } from '@domain/events/transaction-voided.event';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { VoidNotAllowedException } from '@domain/exceptions/void-not-allowed.exception';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { money } from '@shared/utils/money';
import { applyStockChanges, type StockDeductionLine } from '../../services/sale-stock';

export interface VoidTransactionInput {
  transactionId: string;
  employeeId: string;
  businessId: string;
  reason: string;
}

/** Only sales that have not been refunded or put on credit can be voided. */
const VOIDABLE_STATUSES = ['completed', 'pending'] as const;

@Injectable()
export class VoidTransactionUseCase {
  private readonly logger = new Logger(VoidTransactionUseCase.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: VoidTransactionInput): Promise<{ success: boolean; message: string }> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: input.transactionId, outlet: { businessId: input.businessId } },
      select: {
        id: true,
        outletId: true,
        status: true,
        transactionType: true,
        grandTotal: true,
        shift: { select: { status: true } },
        payments: { select: { status: true, metadata: true } },
      },
    });
    if (!transaction) {
      throw new TransactionNotFoundException(input.transactionId);
    }
    if (transaction.transactionType !== 'sale') {
      throw new VoidNotAllowedException('Can only void sale transactions');
    }
    if (transaction.status === 'voided') {
      throw new VoidNotAllowedException('Transaction is already voided');
    }
    if (transaction.status === 'refunded' || transaction.status === 'partially_refunded') {
      throw new VoidNotAllowedException('Cannot void a refunded transaction');
    }
    if (!(VOIDABLE_STATUSES as readonly string[]).includes(transaction.status)) {
      throw new VoidNotAllowedException(
        `Cannot void a transaction with status ${transaction.status}`,
      );
    }
    // A void rewrites the sale as if it never happened: only while its shift is
    // still open. Older sales must be refunded so closed shifts/settlements stay intact.
    if (transaction.shift && transaction.shift.status !== 'open') {
      throw new VoidNotAllowedException(
        'The shift of this sale is closed; process a refund instead',
      );
    }
    const gatewayPaid = transaction.payments.some((p) => {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      return (
        p.status === 'completed' &&
        (typeof meta.gatewayRef === 'string' || typeof meta.gatewayOrderId === 'string')
      );
    });
    if (gatewayPaid) {
      throw new VoidNotAllowedException(
        'A payment-gateway charge was captured; it cannot be reversed by a void',
      );
    }

    const stockChanges = await this.prisma.$transaction(async (tx) => {
      // 1. Conditional status transition: a concurrent second void finds count 0 (R9).
      const { count } = await tx.transaction.updateMany({
        where: {
          id: input.transactionId,
          outlet: { businessId: input.businessId },
          status: { in: [...VOIDABLE_STATUSES] },
        },
        data: {
          status: 'voided',
          voidedAt: new Date(),
          voidedBy: input.employeeId,
          voidReason: input.reason,
        },
      });
      if (count !== 1) {
        throw new VoidNotAllowedException('Transaction was already voided or changed');
      }

      // 2. Money recorded for this sale is no longer collected.
      await tx.payment.updateMany({
        where: { transactionId: input.transactionId, status: 'completed' },
        data: { status: 'refunded' },
      });
      await tx.payment.updateMany({
        where: { transactionId: input.transactionId, status: 'pending' },
        data: { status: 'failed' },
      });

      // 3. Reverse exactly the stock this sale deducted, once per product/variant
      //    (covers regular items and bundle components alike).
      const movements = await tx.stockMovement.findMany({
        where: {
          referenceId: input.transactionId,
          referenceType: 'transaction',
          outletId: transaction.outletId,
        },
        select: { productId: true, variantId: true, quantity: true },
      });
      const lines: StockDeductionLine[] = movements
        .filter((m) => m.productId && money(m.quantity).isNegative())
        .map((m) => ({
          productId: m.productId as string,
          variantId: m.variantId ?? null,
          quantity: money(m.quantity).abs(),
          note: `Void: ${input.reason}`,
        }));
      const changes = await applyStockChanges(tx, lines, {
        outletId: transaction.outletId,
        referenceId: input.transactionId,
        referenceType: 'void',
        employeeId: input.employeeId,
        movementType: 'return_stock',
        direction: 'restore',
        logger: this.logger,
      });

      await tx.auditLog.create({
        data: {
          businessId: input.businessId,
          outletId: transaction.outletId,
          employeeId: input.employeeId,
          action: AUDIT_ACTIONS.TRANSACTION_VOIDED,
          entityType: 'transaction',
          entityId: input.transactionId,
          oldValue: {
            status: transaction.status,
            grandTotal: money(transaction.grandTotal).toNumber(),
          },
          newValue: { status: 'voided', reason: input.reason },
        },
      });

      return changes;
    });

    this.eventBus.publish(
      new TransactionVoidedEvent(
        input.transactionId,
        transaction.outletId,
        money(transaction.grandTotal).toNumber(),
        input.employeeId,
        input.reason,
      ),
    );
    for (const sc of stockChanges) {
      this.eventBus.publish(
        new StockLevelChangedEvent(
          transaction.outletId,
          sc.productId,
          sc.variantId,
          sc.previousQty,
          sc.newQty,
        ),
      );
    }

    return { success: true, message: 'Transaction voided successfully' };
  }
}
