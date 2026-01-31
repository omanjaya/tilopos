import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageConsumerService } from '../message-consumer.service';
import { QUEUES, ROUTING_KEYS } from '../rabbitmq.config';
import type { MessageEnvelope, AmqpMessage } from '../rabbitmq.types';

/**
 * Payload shape for stock.level_changed events.
 */
interface StockChangedPayload {
  readonly outletId: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly previousQuantity: number;
  readonly newQuantity: number;
}

/**
 * Payload shape for stock.transfer_completed events.
 */
interface StockTransferCompletedPayload {
  readonly transferId: string;
  readonly sourceOutletId: string;
  readonly destinationOutletId: string;
  readonly itemCount: number;
}

/**
 * Handles inventory-related messages from the stock queue:
 * - stock.level_changed -> Check low stock thresholds, send alerts
 * - stock.transfer_completed -> Update stock levels at both outlets
 */
@Injectable()
export class InventoryQueueHandler implements OnModuleInit {
  private readonly logger = new Logger(InventoryQueueHandler.name);

  constructor(private readonly consumer: MessageConsumerService) {}

  onModuleInit(): void {
    this.consumer.registerHandler(
      QUEUES.INVENTORY_STOCK,
      (envelope: MessageEnvelope, rawMessage: AmqpMessage) =>
        this.handle(envelope, rawMessage),
    );
  }

  private async handle(envelope: MessageEnvelope, _rawMessage: AmqpMessage): Promise<void> {
    switch (envelope.eventType) {
      case ROUTING_KEYS.STOCK_CHANGED:
        await this.handleStockChanged(envelope.payload as unknown as StockChangedPayload);
        break;
      case ROUTING_KEYS.STOCK_TRANSFER_COMPLETED:
        await this.handleStockTransferCompleted(
          envelope.payload as unknown as StockTransferCompletedPayload,
        );
        break;
      default:
        this.logger.warn(`InventoryQueueHandler: unhandled event type "${envelope.eventType}"`);
    }
  }

  private async handleStockChanged(payload: StockChangedPayload): Promise<void> {
    this.logger.log(
      `Processing stock.level_changed: product ${payload.productId} ` +
      `at outlet ${payload.outletId} (${payload.previousQuantity} -> ${payload.newQuantity})`,
    );

    // Low stock alert logic is handled by the existing StockEventListener
    // via the RxJS bus. This handler is a placeholder for cross-service
    // inventory sync (e.g., updating online store availability).
    await Promise.resolve();
  }

  private async handleStockTransferCompleted(
    payload: StockTransferCompletedPayload,
  ): Promise<void> {
    this.logger.log(
      `Processing stock.transfer_completed: transfer ${payload.transferId} ` +
      `(${payload.sourceOutletId} -> ${payload.destinationOutletId}, ${payload.itemCount} items)`,
    );

    // Stock level adjustments for both outlets are handled by the
    // stock transfer use case. This handler is a placeholder for
    // cross-service notifications (e.g., notifying destination outlet manager).
    await Promise.resolve();
  }
}
