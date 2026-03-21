import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { RefundNotAllowedException } from '@domain/exceptions/refund-not-allowed.exception';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { OrderType } from '@prisma/client';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

export interface RefundItemInput {
  transactionItemId: string;
  quantity: number;
  reason: 'defect' | 'wrong_order' | 'customer_request' | 'other';
}

export interface ProcessRefundInput {
  transactionId: string;
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

@Injectable()
export class ProcessRefundUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: ProcessRefundInput): Promise<ProcessRefundOutput> {
    const original = await this.transactionRepo.findById(input.transactionId);
    if (!original) {
      throw new TransactionNotFoundException(input.transactionId);
    }

    // Check for duplicate refund - prevent refunding already fully refunded transactions
    if (original.status === 'refunded') {
      throw new RefundNotAllowedException('Transaction is already fully refunded');
    }

    if (original.status !== 'completed' && original.status !== 'partially_refunded') {
      throw new RefundNotAllowedException(`Transaction status is ${original.status}`);
    }

    const transactionItems = await this.prisma.transactionItem.findMany({
      where: { transactionId: input.transactionId },
    });

    // Look up previously refunded quantities for this transaction.
    // Use startsWith with the exact prefix pattern to avoid false matches from
    // fuzzy `contains` (e.g. receipt "TXN-123" matching notes containing "TXN-1234").
    const refundNotePrefix = `Refund for: ${original.receiptNumber}`;
    const previousRefunds = await this.prisma.transaction.findMany({
      where: {
        transactionType: 'refund',
        notes: { startsWith: refundNotePrefix },
        status: 'completed',
      },
      select: { id: true },
    });
    const previousRefundIds = previousRefunds.map((r) => r.id);
    const previousRefundItems =
      previousRefundIds.length > 0
        ? await this.prisma.transactionItem.findMany({
            where: { transactionId: { in: previousRefundIds } },
            select: { productId: true, variantId: true, quantity: true, notes: true },
          })
        : [];

    // Build a map of previously refunded quantities by original transactionItemId
    // The refund item's notes field stores the original transactionItemId for tracking
    const refundedQtyByItemId = new Map<string, number>();
    const refundedQtyByProduct = new Map<string, number>();
    for (const ri of previousRefundItems) {
      // Track by original item ID if available (stored in notes as "refund:<originalItemId>" or "refund:<originalItemId>|reason:<reason>")
      const itemIdMatch = ri.notes?.match(/^refund:([^|]+)/);
      if (itemIdMatch && itemIdMatch[1]) {
        const key = itemIdMatch[1];
        refundedQtyByItemId.set(key, (refundedQtyByItemId.get(key) || 0) + Number(ri.quantity));
      } else {
        // Fallback for legacy refunds without item tracking
        const key = `${ri.productId || ''}:${ri.variantId || ''}`;
        refundedQtyByProduct.set(key, (refundedQtyByProduct.get(key) || 0) + Number(ri.quantity));
      }
    }

    let refundSubtotal = 0;
    const refundItems: Array<{
      originalItemId: string;
      productId: string | null;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      reason: string;
      productName: string;
    }> = [];

    for (const refundItem of input.items) {
      const txItem = transactionItems.find((ti) => ti.id === refundItem.transactionItemId);
      if (!txItem) {
        throw new RefundNotAllowedException(
          `Transaction item ${refundItem.transactionItemId} not found`,
        );
      }

      if (refundItem.quantity <= 0) {
        throw new RefundNotAllowedException('Refund quantity must be positive');
      }
      const originalQty = Number(txItem.quantity);
      // Check by specific transactionItemId first, then fallback to product key for legacy
      const alreadyRefunded =
        refundedQtyByItemId.get(txItem.id) ??
        refundedQtyByProduct.get(`${txItem.productId || ''}:${txItem.variantId || ''}`) ??
        0;
      const remainingQty = originalQty - alreadyRefunded;
      if (refundItem.quantity > remainingQty) {
        throw new RefundNotAllowedException(
          `Cannot refund ${refundItem.quantity} units of ${txItem.productName}. Only ${remainingQty} remaining (${originalQty} sold, ${alreadyRefunded} already refunded).`,
        );
      }

      const unitPrice = txItem.unitPrice.toNumber();
      const itemRefund = unitPrice * refundItem.quantity;
      refundSubtotal += itemRefund;

      refundItems.push({
        originalItemId: txItem.id,
        productId: txItem.productId,
        variantId: txItem.variantId,
        quantity: refundItem.quantity,
        unitPrice,
        reason: refundItem.reason,
        productName: txItem.productName,
      });
    }

    const originalSubtotal = original.subtotal || 0;
    // Calculate proportional refund of tax and service charge
    const refundRatio = originalSubtotal === 0 ? 0 : refundSubtotal / originalSubtotal;
    const refundTax = Math.round((original.taxAmount || 0) * refundRatio);
    const refundServiceCharge = Math.round((original.serviceCharge || 0) * refundRatio);
    const refundAmount = refundSubtotal + refundTax + refundServiceCharge;

    const receiptNumber = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Build per-item reason summary for the refund transaction notes
    const itemReasonSummary = refundItems
      .map((item) => `${item.productName} x${item.quantity}: ${item.reason.replace(/_/g, ' ')}`)
      .join('; ');

    // ATOMIC: Wrap refund creation + stock restoration + status update in one transaction
    const { refundTransactionId, stockChanges } = await this.prisma.$transaction(async (tx) => {
      // 1. Create refund transaction record
      const notesParts = [`Refund for: ${original.receiptNumber}`];
      if (itemReasonSummary) notesParts.push(`Items: ${itemReasonSummary}`);
      if (input.notes) notesParts.push(input.notes);

      const refundTx = await tx.transaction.create({
        data: {
          outletId: original.outletId,
          employeeId: input.employeeId,
          customerId: original.customerId || null,
          shiftId: original.shiftId,
          receiptNumber,
          transactionType: 'refund',
          orderType: original.orderType as OrderType,
          tableId: null,
          subtotal: -refundSubtotal,
          discountAmount: 0,
          taxAmount: -refundTax,
          serviceCharge: -refundServiceCharge,
          grandTotal: -refundAmount,
          notes: notesParts.join(' - '),
          status: 'completed',
        },
      });

      // 2. Create refund transaction items (with original item ID and reason tracking in notes)
      for (const item of refundItems) {
        await tx.transactionItem.create({
          data: {
            transactionId: refundTx.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            subtotal: item.unitPrice * item.quantity,
            notes: `refund:${item.originalItemId}|reason:${item.reason}`,
          },
        });
      }

      // 3. Restore stock for each refund item
      const changes: Array<{
        productId: string;
        variantId: string | null;
        previousQty: number;
        newQty: number;
      }> = [];

      for (const item of refundItems) {
        if (item.productId) {
          const stockLevel = await tx.stockLevel.findFirst({
            where: {
              outletId: original.outletId,
              productId: item.productId,
              variantId: item.variantId,
            },
          });
          if (stockLevel) {
            const previousQty = Number(stockLevel.quantity);
            const updated = await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: { quantity: { increment: item.quantity } },
            });
            await tx.stockMovement.create({
              data: {
                outletId: original.outletId,
                productId: item.productId,
                variantId: item.variantId,
                movementType: 'return_stock',
                quantity: item.quantity,
                referenceId: refundTx.id,
                referenceType: 'refund',
                notes: null,
                createdBy: input.employeeId,
                createdAt: new Date(),
              },
            });
            changes.push({
              productId: item.productId,
              variantId: item.variantId,
              previousQty,
              newQty: Number(updated.quantity),
            });
          }
        }
      }

      // 4. Determine if fully refunded and update original transaction status
      const previousRefundTotal =
        previousRefunds.length > 0
          ? (
              await tx.transaction.aggregate({
                where: { id: { in: previousRefundIds } },
                _sum: { subtotal: true },
              })
            )._sum.subtotal
          : null;
      const cumulativeRefundSubtotal = refundSubtotal + Math.abs(Number(previousRefundTotal || 0));
      const isAllRefunded = cumulativeRefundSubtotal >= original.subtotal;
      await tx.transaction.update({
        where: { id: input.transactionId },
        data: { status: isAllRefunded ? 'refunded' : 'partially_refunded' },
      });

      // 5. Audit log inside transaction
      await tx.auditLog.create({
        data: {
          businessId: original.businessId || '',
          outletId: original.outletId,
          employeeId: input.employeeId,
          action: 'transaction_refunded',
          entityType: 'transaction',
          entityId: original.id,
          oldValue: { status: original.status, grandTotal: original.grandTotal },
          newValue: { status: isAllRefunded ? 'refunded' : 'partially_refunded', refundAmount },
          metadata: {
            refundMethod: input.refundMethod,
            reason: input.notes,
            itemReasons: refundItems.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              reason: item.reason,
            })),
          },
        },
      });

      return {
        refundTransactionId: refundTx.id,
        stockChanges: changes,
        allRefunded: isAllRefunded,
      };
    });

    // Events published AFTER successful transaction commit
    for (const sc of stockChanges) {
      this.eventBus.publish(
        new StockLevelChangedEvent(
          original.outletId,
          sc.productId,
          sc.variantId,
          sc.previousQty,
          sc.newQty,
        ),
      );
    }

    return {
      refundTransactionId,
      refundAmount,
      receiptNumber,
    };
  }
}
