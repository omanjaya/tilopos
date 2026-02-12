import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionVoidedEvent } from '@domain/events/transaction-voided.event';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { VoidNotAllowedException } from '@domain/exceptions/void-not-allowed.exception';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

export interface VoidTransactionInput {
  transactionId: string;
  employeeId: string;
  businessId: string;
  outletId: string;
  reason: string;
}

@Injectable()
export class VoidTransactionUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: VoidTransactionInput): Promise<{ success: boolean; message: string }> {
    const transaction = await this.transactionRepo.findById(input.transactionId);
    if (!transaction) {
      throw new TransactionNotFoundException(input.transactionId);
    }

    if (transaction.status === 'voided') {
      throw new VoidNotAllowedException('Transaction is already voided');
    }

    if (transaction.status === 'refunded') {
      throw new VoidNotAllowedException('Cannot void a refunded transaction');
    }

    if (transaction.transactionType !== 'sale') {
      throw new VoidNotAllowedException('Can only void sale transactions');
    }

    await this.transactionRepo.update(input.transactionId, {
      status: 'voided',
      voidedAt: new Date(),
      voidedBy: input.employeeId,
      voidReason: input.reason,
    });

    const items = await this.transactionRepo.findItemsByTransactionId(input.transactionId);
    const stockChanges: Array<{ productId: string; variantId: string | null; previousQty: number; newQty: number }> = [];

    for (const item of items) {
      if (!item.productId) continue;
      const stockLevel = await this.inventoryRepo.findStockLevel(
        transaction.outletId,
        item.productId,
        item.variantId || null,
      );
      if (stockLevel) {
        const previousQty = stockLevel.quantity;
        const restoredQty = previousQty + item.quantity;
        await this.inventoryRepo.updateStockLevel(stockLevel.id, restoredQty);
        await this.inventoryRepo.createStockMovement({
          id: '',
          outletId: transaction.outletId,
          productId: item.productId,
          variantId: item.variantId || null,
          movementType: 'return_stock',
          quantity: item.quantity,
          referenceId: input.transactionId,
          referenceType: 'void',
          notes: `Void: ${input.reason}`,
          createdBy: input.employeeId,
          createdAt: new Date(),
        });
        stockChanges.push({ productId: item.productId, variantId: item.variantId || null, previousQty, newQty: restoredQty });
      }
    }

    await this.auditRepo.create({
      id: '',
      businessId: input.businessId,
      outletId: input.outletId,
      employeeId: input.employeeId,
      action: 'transaction_voided',
      entityType: 'transaction',
      entityId: input.transactionId,
      oldValue: { status: transaction.status, grandTotal: transaction.grandTotal },
      newValue: { status: 'voided', reason: input.reason },
      ipAddress: null,
      deviceId: null,
      metadata: null,
      createdAt: new Date(),
    });

    this.eventBus.publish(
      new TransactionVoidedEvent(
        input.transactionId,
        transaction.outletId,
        transaction.grandTotal,
        input.employeeId,
        input.reason,
      ),
    );

    // Publish stock change events so inventory displays update in real-time
    for (const sc of stockChanges) {
      this.eventBus.publish(
        new StockLevelChangedEvent(transaction.outletId, sc.productId, sc.variantId, sc.previousQty, sc.newQty),
      );
    }

    return { success: true, message: 'Transaction voided successfully' };
  }
}
