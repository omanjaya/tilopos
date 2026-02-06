import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { CreateOrderUseCase } from '@application/use-cases/orders/create-order.use-case';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * Event handler that automatically creates KDS orders from POS transactions
 * When a transaction is completed at POS, this handler creates a corresponding
 * order for the kitchen display system
 */
@Injectable()
export class TransactionToOrderHandler implements OnModuleInit {
  private readonly logger = new Logger(TransactionToOrderHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      void this.handleTransactionCreated(event);
    });
  }

  private async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Creating KDS order for transaction ${event.transactionId}`);

      // Fetch transaction details with items
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: event.transactionId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (!transaction) {
        this.logger.warn(`Transaction ${event.transactionId} not found`);
        return;
      }

      // Only create orders for transactions that need kitchen preparation
      // (dine_in, takeaway, delivery - not for retail/quick sales)
      const orderTypes = ['dine_in', 'takeaway', 'delivery'];
      if (!orderTypes.includes(transaction.orderType)) {
        this.logger.debug(
          `Skipping order creation for transaction ${event.transactionId} with orderType ${transaction.orderType}`,
        );
        return;
      }

      // Skip if transaction has no items
      if (transaction.items.length === 0) {
        this.logger.debug(`Transaction ${event.transactionId} has no items, skipping order creation`);
        return;
      }

      // Filter out items with null productId and convert Decimal quantity to number
      const validItems = transaction.items
        .filter((item) => item.productId !== null)
        .map((item) => ({
          productId: item.productId!,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity),
          notes: item.notes || undefined,
          // Determine station based on product category if available
          station: item.product?.categoryId || undefined,
        }));

      if (validItems.length === 0) {
        this.logger.warn(`Transaction ${event.transactionId} has no valid items, skipping order creation`);
        return;
      }

      // Create order for kitchen
      const orderResult = await this.createOrderUseCase.execute({
        outletId: transaction.outletId,
        orderType: transaction.orderType as 'dine_in' | 'takeaway' | 'delivery',
        tableId: transaction.tableId || undefined,
        customerId: transaction.customerId || undefined,
        items: validItems,
        notes: transaction.notes || undefined,
        priority: 0, // Normal priority by default
      });

      this.logger.log(
        `✅ Successfully created order ${orderResult.orderNumber} (${orderResult.orderId}) from transaction ${event.transactionId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `❌ Failed to create order from transaction ${event.transactionId}: ${errorMessage}`,
        errorStack,
      );
      // Don't throw - we don't want to fail the transaction if order creation fails
      // The transaction payment is already completed, this is just for kitchen notification
    }
  }
}
