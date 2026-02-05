import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { RefundNotAllowedException } from '@domain/exceptions/refund-not-allowed.exception';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

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
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
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

    let refundSubtotal = 0;
    const refundItems: Array<{
      productId: string | null;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const refundItem of input.items) {
      const txItem = transactionItems.find((ti) => ti.id === refundItem.transactionItemId);
      if (!txItem) {
        throw new RefundNotAllowedException(
          `Transaction item ${refundItem.transactionItemId} not found`,
        );
      }

      const unitPrice = txItem.unitPrice.toNumber();
      const itemRefund = unitPrice * refundItem.quantity;
      refundSubtotal += itemRefund;

      refundItems.push({
        productId: txItem.productId,
        variantId: txItem.variantId,
        quantity: refundItem.quantity,
        unitPrice,
      });
    }

    const originalSubtotal = original.subtotal || 0;
    // If subtotal is 0 (fully discounted), tax proportion is 0
    const taxProportion = originalSubtotal === 0 ? 0 : original.taxAmount / originalSubtotal;
    const refundTax = Math.round(refundSubtotal * taxProportion);
    const refundAmount = refundSubtotal + refundTax;

    const receiptNumber = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const refundTransaction = await this.transactionRepo.save({
      id: '',
      outletId: original.outletId,
      employeeId: input.employeeId,
      customerId: original.customerId,
      shiftId: original.shiftId,
      receiptNumber,
      transactionType: 'refund',
      orderType: original.orderType,
      tableId: null,
      subtotal: -refundSubtotal,
      discountAmount: 0,
      taxAmount: -refundTax,
      serviceCharge: 0,
      grandTotal: -refundAmount,
      notes: input.notes || `Refund for ${original.receiptNumber}`,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const item of refundItems) {
      if (item.productId) {
        const stockLevel = await this.inventoryRepo.findStockLevel(
          original.outletId,
          item.productId,
          item.variantId,
        );
        if (stockLevel) {
          await this.inventoryRepo.updateStockLevel(
            stockLevel.id,
            stockLevel.quantity + item.quantity,
          );
          await this.inventoryRepo.createStockMovement({
            id: '',
            outletId: original.outletId,
            productId: item.productId,
            variantId: item.variantId,
            movementType: 'return_stock',
            quantity: item.quantity,
            referenceId: refundTransaction.id,
            referenceType: 'refund',
            notes: null,
            createdBy: input.employeeId,
            createdAt: new Date(),
          });
        }
      }
    }

    const allRefunded = refundSubtotal >= original.subtotal;
    await this.transactionRepo.update(input.transactionId, {
      status: allRefunded ? 'refunded' : 'partially_refunded',
    });

    await this.auditRepo.create({
      id: '',
      businessId: original.businessId || '',
      outletId: original.outletId,
      employeeId: input.employeeId,
      action: 'transaction_refunded',
      entityType: 'transaction',
      entityId: original.id,
      oldValue: { status: original.status, grandTotal: original.grandTotal },
      newValue: { status: allRefunded ? 'refunded' : 'partially_refunded', refundAmount },
      ipAddress: null,
      deviceId: null,
      metadata: { refundMethod: input.refundMethod, reason: input.notes },
      createdAt: new Date(),
    });

    void this.eventBus;

    return {
      refundTransactionId: refundTransaction.id,
      refundAmount,
      receiptNumber,
    };
  }
}
