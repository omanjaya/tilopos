import { Injectable, Logger } from '@nestjs/common';
import { AUDIT_ACTIONS } from '@modules/audit/audit-actions';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { RefundNotAllowedException } from '@domain/exceptions/refund-not-allowed.exception';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { DocumentNumberService } from '@shared/numbering';
import { money, roundRupiah, sumMoney, minMoney, nonNegative } from '@shared/utils/money';
import { applyStockChanges, type StockDeductionLine } from '../../services/sale-stock';

export interface RefundItemInput {
  transactionItemId: string;
  quantity: number;
  reason: 'defect' | 'wrong_order' | 'customer_request' | 'other';
}

export interface ProcessRefundInput {
  transactionId: string;
  businessId: string;
  employeeId: string;
  items: RefundItemInput[];
  refundMethod: 'cash' | 'original_method' | 'store_credit';
  notes?: string;
}

export interface ProcessRefundOutput {
  refundTransactionId: string;
  refundAmount: number;
  creditNoteId?: string;
  receiptNumber: string;
}

type OriginalTx = Prisma.TransactionGetPayload<{
  include: { items: true; payments: true };
}>;

/**
 * Legacy link: refund lines created before refund_of_item_id carry the sold line id in the
 * note (`refund:<itemId>|reason:<reason>`). New lines set refundOfItemId and keep the note.
 */
const REFUND_ITEM_NOTE = /^refund:([^|]+)/;

@Injectable()
export class ProcessRefundUseCase {
  private readonly logger = new Logger(ProcessRefundUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async execute(input: ProcessRefundInput): Promise<ProcessRefundOutput> {
    if (input.refundMethod === 'store_credit') {
      // No credit-note ledger exists yet: refuse instead of pretending (R10).
      throw new BusinessError(
        ErrorCode.REFUND_NOT_ALLOWED,
        'Refund as store credit is not supported yet; refund in cash or to the original method',
      );
    }

    // Everything (reads, checks, writes) runs under a row lock on the original
    // sale, so two concurrent refunds can never both pass the quantity check (R9).
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT t.id FROM transactions t
          JOIN outlets o ON o.id = t.outlet_id
         WHERE t.id = ${input.transactionId}::uuid
           AND o.business_id = ${input.businessId}::uuid
           AND t.transaction_type = 'sale'
         FOR UPDATE OF t`;
      if (locked.length === 0) {
        throw new TransactionNotFoundException(input.transactionId);
      }

      const original = await tx.transaction.findFirst({
        where: { id: input.transactionId, outlet: { businessId: input.businessId } },
        include: { items: true, payments: true },
      });
      if (!original) throw new TransactionNotFoundException(input.transactionId);

      if (original.status === 'refunded') {
        throw new RefundNotAllowedException('Transaction is already fully refunded');
      }
      if (original.status !== 'completed' && original.status !== 'partially_refunded') {
        throw new RefundNotAllowedException(`Transaction status is ${original.status}`);
      }

      const previous = await tx.transaction.findMany({
        where: {
          transactionType: 'refund',
          status: 'completed',
          OR: [
            { refundOfId: original.id },
            // Legacy refunds created before refund_of_id existed.
            {
              refundOfId: null,
              outletId: original.outletId,
              notes: { startsWith: `Refund for: ${original.receiptNumber}` },
            },
          ],
        },
        select: {
          grandTotal: true,
          items: {
            select: {
              productId: true,
              variantId: true,
              quantity: true,
              notes: true,
              refundOfItemId: true,
            },
          },
        },
      });

      const plan = this.planRefund(original, previous, input.items);
      const shiftId = await this.resolveShift(tx, input, original.outletId);
      const payments = this.allocatePayments(original, plan.refundAmount, input.refundMethod);

      const receiptNumber = await this.documentNumbers.next(tx, input.businessId, 'REF');
      const summary = plan.lines
        .map((l) => `${l.productName} x${l.quantity}: ${l.reason.replace(/_/g, ' ')}`)
        .join('; ');
      const notes = [
        `Refund for: ${original.receiptNumber}`,
        summary && `Items: ${summary}`,
        input.notes,
      ]
        .filter(Boolean)
        .join(' - ');

      const refundTx = await tx.transaction.create({
        data: {
          outletId: original.outletId,
          employeeId: input.employeeId,
          customerId: original.customerId,
          shiftId,
          receiptNumber,
          transactionType: 'refund',
          orderType: original.orderType,
          tableId: null,
          refundOfId: original.id,
          subtotal: plan.subtotal.negated(),
          discountAmount: plan.discount.negated(),
          taxAmount: plan.tax.negated(),
          serviceCharge: plan.service.negated(),
          grandTotal: plan.refundAmount.negated(),
          notes,
          status: 'completed',
          items: {
            create: plan.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              bundleId: l.bundleId,
              productName: l.productName,
              variantName: l.variantName,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountAmount: 0,
              subtotal: l.value,
              refundOfItemId: l.originalItemId,
              notes: `refund:${l.originalItemId}|reason:${l.reason}`,
            })),
          },
          // Money paid back, per method (positive amounts on a refund transaction).
          payments: {
            create: payments.map((p) => ({
              paymentMethod: p.method,
              amount: p.amount,
              status: 'completed' as const,
              metadata: { refundOf: original.id, refundMethod: input.refundMethod },
            })),
          },
        },
        select: { id: true },
      });

      const stockLines = await this.stockToRestore(tx, input.businessId, plan.lines);
      const stockChanges = await applyStockChanges(tx, stockLines, {
        outletId: original.outletId,
        referenceId: refundTx.id,
        referenceType: 'refund',
        employeeId: input.employeeId,
        movementType: 'return_stock',
        direction: 'restore',
        logger: this.logger,
      });

      const newStatus = plan.fullyRefunded ? 'refunded' : 'partially_refunded';
      const { count } = await tx.transaction.updateMany({
        where: { id: original.id, status: { in: ['completed', 'partially_refunded'] } },
        data: { status: newStatus },
      });
      if (count !== 1) {
        throw new RefundNotAllowedException('Transaction changed during refund');
      }

      await tx.auditLog.create({
        data: {
          businessId: input.businessId,
          outletId: original.outletId,
          employeeId: input.employeeId,
          action: AUDIT_ACTIONS.TRANSACTION_REFUNDED,
          entityType: 'transaction',
          entityId: original.id,
          oldValue: { status: original.status, grandTotal: money(original.grandTotal).toNumber() },
          newValue: {
            status: newStatus,
            refundAmount: plan.refundAmount.toNumber(),
            refundTransactionId: refundTx.id,
          },
          metadata: {
            refundMethod: input.refundMethod,
            reason: input.notes ?? null,
            payments: payments.map((p) => ({ method: p.method, amount: p.amount.toNumber() })),
            itemReasons: plan.lines.map((l) => ({
              productName: l.productName,
              quantity: l.quantity,
              reason: l.reason,
            })),
          },
        },
      });

      return {
        refundTransactionId: refundTx.id,
        receiptNumber,
        refundAmount: plan.refundAmount,
        outletId: original.outletId,
        stockChanges,
      };
    });

    for (const sc of result.stockChanges) {
      this.eventBus.publish(
        new StockLevelChangedEvent(
          result.outletId,
          sc.productId,
          sc.variantId,
          sc.previousQty,
          sc.newQty,
        ),
      );
    }

    return {
      refundTransactionId: result.refundTransactionId,
      refundAmount: result.refundAmount.toNumber(),
      receiptNumber: result.receiptNumber,
    };
  }

  // ---------------------------------------------------------------------------

  /**
   * Validates quantities against what is still refundable and computes the
   * refund: line value minus the pro-rata share of the sale discount, plus the
   * pro-rata tax/service charge. Cumulative refunds never exceed the grand total.
   */
  planRefund(
    original: OriginalTx,
    previous: Array<{
      grandTotal: Prisma.Decimal;
      items: Array<{
        productId: string | null;
        variantId: string | null;
        quantity: Prisma.Decimal;
        notes: string | null;
        refundOfItemId?: string | null;
      }>;
    }>,
    requested: RefundItemInput[],
  ) {
    const refundedByItem = new Map<string, Prisma.Decimal>();
    const refundedByProduct = new Map<string, Prisma.Decimal>();
    for (const refund of previous) {
      for (const ri of refund.items) {
        // refund_of_item_id links the line; older rows carry the id in the note only.
        const itemId = ri.refundOfItemId ?? ri.notes?.match(REFUND_ITEM_NOTE)?.[1];
        const map = itemId ? refundedByItem : refundedByProduct;
        const key = itemId ?? `${ri.productId ?? ''}:${ri.variantId ?? ''}`;
        map.set(key, (map.get(key) ?? money(0)).plus(money(ri.quantity)));
      }
    }

    // Duplicate ids in one request are summed before the remaining-qty check.
    const wanted = new Map<
      string,
      { quantity: Prisma.Decimal; reason: RefundItemInput['reason'] }
    >();
    for (const item of requested) {
      if (!(item.quantity > 0)) {
        throw new RefundNotAllowedException('Refund quantity must be positive');
      }
      const prev = wanted.get(item.transactionItemId);
      wanted.set(item.transactionItemId, {
        quantity: (prev?.quantity ?? money(0)).plus(money(item.quantity)),
        reason: prev?.reason ?? item.reason,
      });
    }

    const lines = [...wanted.entries()].map(([itemId, want]) => {
      const txItem = original.items.find((ti) => ti.id === itemId);
      if (!txItem) {
        throw new RefundNotAllowedException(`Transaction item ${itemId} not found`);
      }
      const sold = money(txItem.quantity);
      const already =
        refundedByItem.get(txItem.id) ??
        refundedByProduct.get(`${txItem.productId ?? ''}:${txItem.variantId ?? ''}`) ??
        money(0);
      const remaining = sold.minus(already);
      if (want.quantity.gt(remaining)) {
        throw new RefundNotAllowedException(
          `Cannot refund ${want.quantity.toString()} units of ${txItem.productName}. Only ${remaining.toString()} remaining (${sold.toString()} sold, ${already.toString()} already refunded).`,
        );
      }
      return {
        originalItemId: txItem.id,
        productId: txItem.productId,
        variantId: txItem.variantId,
        bundleId: txItem.bundleId,
        productName: txItem.productName,
        variantName: txItem.variantName,
        unitPrice: money(txItem.unitPrice),
        quantity: want.quantity.toNumber(),
        value: roundRupiah(money(txItem.unitPrice).times(want.quantity)),
        reason: want.reason,
        remainingAfter: remaining.minus(want.quantity),
      };
    });

    const subtotal = sumMoney(lines.map((l) => l.value));
    const originalSubtotal = money(original.subtotal);
    const ratio = originalSubtotal.gt(0) ? subtotal.dividedBy(originalSubtotal) : money(0);
    const discount = roundRupiah(money(original.discountAmount).times(ratio));
    const tax = roundRupiah(money(original.taxAmount).times(ratio));
    const service = roundRupiah(money(original.serviceCharge).times(ratio));

    const refundedBefore = sumMoney(previous.map((p) => money(p.grandTotal).abs()));
    const refundable = nonNegative(money(original.grandTotal).minus(refundedBefore));

    // Fully refunded when every sold unit has now been returned.
    const fullyRefunded = original.items.every((ti) => {
      const line = lines.find((l) => l.originalItemId === ti.id);
      if (line) return line.remainingAfter.lte(0);
      const already =
        refundedByItem.get(ti.id) ??
        refundedByProduct.get(`${ti.productId ?? ''}:${ti.variantId ?? ''}`) ??
        money(0);
      return already.gte(money(ti.quantity));
    });

    // The last refund returns exactly what is left (absorbs rounding); otherwise cap it.
    const computed = nonNegative(subtotal.minus(discount).plus(tax).plus(service));
    const refundAmount = fullyRefunded ? refundable : minMoney(computed, refundable);

    return { lines, subtotal, discount, tax, service, refundAmount, fullyRefunded };
  }

  /**
   * Refund money goes back per method. Cash refunds are paid from the drawer;
   * 'original_method' mirrors the original payments (non-cash first, cash net of
   * change last). Gateway payments cannot be reversed from here yet.
   */
  private allocatePayments(
    original: OriginalTx,
    amount: Prisma.Decimal,
    method: ProcessRefundInput['refundMethod'],
  ): Array<{ method: PaymentMethod; amount: Prisma.Decimal }> {
    if (amount.lte(0)) return [];
    if (method === 'cash') return [{ method: 'cash', amount }];

    const completed = original.payments.filter((p) => p.status === 'completed');
    const viaGateway = completed.some((p) => {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      return typeof meta.gatewayRef === 'string' || typeof meta.gatewayOrderId === 'string';
    });
    if (viaGateway) {
      throw new BusinessError(
        ErrorCode.REFUND_NOT_ALLOWED,
        'Automatic refunds to a payment-gateway method are not supported yet; refund in cash',
      );
    }

    const paid = sumMoney(completed.map((p) => p.amount));
    const change = nonNegative(paid.minus(money(original.grandTotal)));
    const ordered = [
      ...completed.filter((p) => p.paymentMethod !== 'cash'),
      ...completed.filter((p) => p.paymentMethod === 'cash'),
    ];

    const result: Array<{ method: PaymentMethod; amount: Prisma.Decimal }> = [];
    let left = amount;
    let changeLeft = change;
    for (const p of ordered) {
      if (left.lte(0)) break;
      let available = money(p.amount);
      if (p.paymentMethod === 'cash') {
        const netted = minMoney(changeLeft, available);
        available = available.minus(netted);
        changeLeft = changeLeft.minus(netted);
      }
      const take = minMoney(available, left);
      if (take.gt(0)) {
        result.push({ method: p.paymentMethod, amount: take });
        left = left.minus(take);
      }
    }
    if (left.gt(0)) result.push({ method: 'cash', amount: left });
    return result;
  }

  /** Refunds are booked into the refunding employee's open shift (cash leaves that drawer). */
  private async resolveShift(
    tx: Prisma.TransactionClient,
    input: ProcessRefundInput,
    outletId: string,
  ): Promise<string | null> {
    const shift = await tx.shift.findFirst({
      where: { employeeId: input.employeeId, outletId, status: 'open' },
      select: { id: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!shift && input.refundMethod === 'cash') {
      throw new BusinessError(
        ErrorCode.SHIFT_NOT_OPEN,
        'Open a shift at this outlet before giving a cash refund',
      );
    }
    return shift?.id ?? null;
  }

  /** Product lines restore their own stock; bundle lines restore each component once. */
  private async stockToRestore(
    tx: Prisma.TransactionClient,
    businessId: string,
    lines: ReturnType<ProcessRefundUseCase['planRefund']>['lines'],
  ): Promise<StockDeductionLine[]> {
    const result: StockDeductionLine[] = [];
    const bundleIds = [...new Set(lines.map((l) => l.bundleId).filter((b): b is string => !!b))];
    const bundles = bundleIds.length
      ? await tx.bundlePackage.findMany({
          where: { id: { in: bundleIds }, businessId },
          select: {
            id: true,
            items: {
              select: {
                productId: true,
                variantId: true,
                quantity: true,
                product: { select: { trackStock: true } },
              },
            },
          },
        })
      : [];
    const bundleById = new Map(bundles.map((b) => [b.id, b]));

    for (const line of lines) {
      if (line.productId) {
        result.push({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          note: `Refund: ${line.productName}`,
        });
      } else if (line.bundleId) {
        const bundle = bundleById.get(line.bundleId);
        if (!bundle) {
          this.logger.warn(
            `Bundle ${line.bundleId} no longer exists; component stock not restored`,
          );
          continue;
        }
        for (const c of bundle.items) {
          if (!c.product.trackStock) continue;
          result.push({
            productId: c.productId,
            variantId: c.variantId ?? null,
            quantity: money(c.quantity).times(line.quantity),
            note: `Refund bundle component: ${line.productName}`,
          });
        }
      }
    }
    return result;
  }
}
