import { ConflictException, HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { CreateOrderUseCase } from '@application/use-cases/orders/create-order.use-case';
import { PrismaService } from '@infrastructure/database/prisma.service';

const KITCHEN_ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'] as const;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

/**
 * Creates the kitchen (KDS) order for a completed POS transaction.
 *
 * Idempotent: the order id is the transaction id, so a replayed or duplicated
 * TransactionCreatedEvent hits the primary key and is skipped instead of
 * sending the same food to the kitchen twice. Transient failures are retried.
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

  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.createKitchenOrder(event.transactionId);
        return;
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.debug(`Kitchen order for transaction ${event.transactionId} already exists`);
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        // Validation errors (4xx) will not succeed on retry.
        if (attempt === MAX_ATTEMPTS || error instanceof HttpException) {
          // The sale itself is committed; surface loudly so the outlet can re-send
          // the ticket manually. (A durable retry queue is tracked separately.)
          this.logger.error(
            `KITCHEN_ORDER_FAILED transaction=${event.transactionId} outlet=${event.outletId}: ${message}`,
            error instanceof Error ? error.stack : undefined,
          );
          return;
        }
        this.logger.warn(
          `Kitchen order for transaction ${event.transactionId} failed (attempt ${attempt}): ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  private async createKitchenOrder(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        outlet: { select: { businessId: true } },
        items: { select: { productId: true, variantId: true, quantity: true, notes: true } },
      },
    });

    if (!transaction) {
      this.logger.warn(`Transaction ${transactionId} not found`);
      return;
    }

    if (!(KITCHEN_ORDER_TYPES as readonly string[]).includes(transaction.orderType)) {
      return;
    }

    const items = transaction.items
      .filter((item) => item.productId !== null)
      .map((item) => ({
        productId: item.productId as string,
        variantId: item.variantId ?? undefined,
        // Kitchen tickets count whole portions; fractional (weighed) lines round up.
        quantity: Math.max(1, Math.ceil(Number(item.quantity))),
        notes: item.notes ?? undefined,
        // No product→station mapping exists yet: items go to the general station.
      }));

    if (items.length === 0) {
      return;
    }

    const result = await this.createOrderUseCase.execute({
      id: transaction.id,
      businessId: transaction.outlet.businessId,
      outletId: transaction.outletId,
      orderType: transaction.orderType as (typeof KITCHEN_ORDER_TYPES)[number],
      tableId: transaction.tableId ?? undefined,
      customerId: transaction.customerId ?? undefined,
      items,
      notes: transaction.notes ?? undefined,
      priority: 0,
      // Match the kitchen ticket to the receipt when the number fits the column.
      orderNumber: transaction.receiptNumber,
      // The sale is paid: it must reach the kitchen even if the table is busy.
      onTableUnavailable: 'keep',
    });

    this.logger.log(
      `Created kitchen order ${result.orderNumber} from transaction ${transactionId}`,
    );
  }
}
