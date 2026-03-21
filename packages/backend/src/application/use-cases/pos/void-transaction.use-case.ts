import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TransactionVoidedEvent } from '@domain/events/transaction-voided.event';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { VoidNotAllowedException } from '@domain/exceptions/void-not-allowed.exception';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

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
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: VoidTransactionInput): Promise<{ success: boolean; message: string }> {
    const transaction = await this.transactionRepo.findById(input.transactionId);
    if (!transaction) {
      throw new TransactionNotFoundException(input.transactionId);
    }

    if (transaction.status === 'voided') {
      throw new VoidNotAllowedException('Transaction is already voided');
    }

    if (transaction.status === 'refunded' || transaction.status === 'partially_refunded') {
      throw new VoidNotAllowedException('Cannot void a refunded transaction');
    }

    if (transaction.transactionType !== 'sale') {
      throw new VoidNotAllowedException('Can only void sale transactions');
    }

    const items = await this.transactionRepo.findItemsByTransactionId(input.transactionId);

    // ATOMIC: Wrap status update + stock restoration in a single transaction
    const stockChanges = await this.prisma.$transaction(async (tx) => {
      // 1. Update transaction status
      await tx.transaction.update({
        where: { id: input.transactionId },
        data: {
          status: 'voided',
          voidedAt: new Date(),
          voidedBy: input.employeeId,
          voidReason: input.reason,
        },
      });

      const changes: Array<{
        productId: string;
        variantId: string | null;
        previousQty: number;
        newQty: number;
      }> = [];

      // 2. Restore stock for each item
      for (const item of items) {
        if (item.productId) {
          // Regular product - restore stock directly
          const stockLevel = await tx.stockLevel.findFirst({
            where: {
              outletId: transaction.outletId,
              productId: item.productId,
              variantId: item.variantId || null,
            },
          });
          if (stockLevel) {
            const previousQty = Number(stockLevel.quantity);
            const restoredQty = previousQty + item.quantity;
            await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: { quantity: restoredQty },
            });
            await tx.stockMovement.create({
              data: {
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
              },
            });
            changes.push({
              productId: item.productId,
              variantId: item.variantId || null,
              previousQty,
              newQty: restoredQty,
            });
          }
        } else if (item.bundleId) {
          // Bundle item - restore stock for each component via original stock movements
          const originalMovements = await tx.stockMovement.findMany({
            where: {
              referenceId: input.transactionId,
              referenceType: 'transaction',
            },
          });

          for (const movement of originalMovements) {
            if (Number(movement.quantity) >= 0 || !movement.productId) continue;
            const stockLevel = await tx.stockLevel.findFirst({
              where: {
                outletId: transaction.outletId,
                productId: movement.productId,
                variantId: movement.variantId || null,
              },
            });
            if (stockLevel) {
              const restoreQty = Math.abs(Number(movement.quantity));
              const previousQty = Number(stockLevel.quantity);
              const restoredQty = previousQty + restoreQty;
              await tx.stockLevel.update({
                where: { id: stockLevel.id },
                data: { quantity: restoredQty },
              });
              await tx.stockMovement.create({
                data: {
                  outletId: transaction.outletId,
                  productId: movement.productId,
                  variantId: movement.variantId || null,
                  movementType: 'return_stock',
                  quantity: restoreQty,
                  referenceId: input.transactionId,
                  referenceType: 'void',
                  notes: `Void bundle component: ${input.reason}`,
                  createdBy: input.employeeId,
                  createdAt: new Date(),
                },
              });
              changes.push({
                productId: movement.productId,
                variantId: movement.variantId || null,
                previousQty,
                newQty: restoredQty,
              });
            }
          }
        }
      }

      // 3. Create audit log inside transaction
      await tx.auditLog.create({
        data: {
          businessId: input.businessId,
          outletId: input.outletId,
          employeeId: input.employeeId,
          action: 'transaction_voided',
          entityType: 'transaction',
          entityId: input.transactionId,
          oldValue: { status: transaction.status, grandTotal: transaction.grandTotal },
          newValue: { status: 'voided', reason: input.reason },
        },
      });

      return changes;
    });

    // Events published AFTER successful transaction commit
    this.eventBus.publish(
      new TransactionVoidedEvent(
        input.transactionId,
        transaction.outletId,
        transaction.grandTotal,
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
