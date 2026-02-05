import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageConsumerService } from '../message-consumer.service';
import { QUEUES, ROUTING_KEYS } from '../rabbitmq.config';
import type { MessageEnvelope, AmqpMessage } from '../rabbitmq.types';

/**
 * Payload shape for notification.send events.
 */
interface NotificationSendPayload {
  readonly recipientId: string;
  readonly channel: 'push' | 'email' | 'whatsapp' | 'sms';
  readonly title: string;
  readonly body: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Payload shape for stock.level_changed events routed to notifications.
 */
interface StockAlertPayload {
  readonly outletId: string;
  readonly productId: string;
  readonly variantId: string | null;
  readonly previousQuantity: number;
  readonly newQuantity: number;
}

/**
 * Handles notification delivery messages:
 * - notification.send -> Dispatch through configured notification channels
 * - stock.level_changed -> Generate and send low stock alert notifications
 */
@Injectable()
export class NotificationQueueHandler implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueHandler.name);

  constructor(private readonly consumer: MessageConsumerService) {}

  onModuleInit(): void {
    this.consumer.registerHandler(
      QUEUES.NOTIFICATIONS_SEND,
      (envelope: MessageEnvelope, rawMessage: AmqpMessage) => this.handle(envelope, rawMessage),
    );
  }

  private async handle(envelope: MessageEnvelope, _rawMessage: AmqpMessage): Promise<void> {
    switch (envelope.eventType) {
      case ROUTING_KEYS.NOTIFICATION_SEND:
        await this.handleNotificationSend(envelope.payload as unknown as NotificationSendPayload);
        break;
      case ROUTING_KEYS.STOCK_CHANGED:
        await this.handleStockAlert(envelope.payload as unknown as StockAlertPayload);
        break;
      default:
        this.logger.warn(`NotificationQueueHandler: unhandled event type "${envelope.eventType}"`);
    }
  }

  private async handleNotificationSend(payload: NotificationSendPayload): Promise<void> {
    this.logger.log(
      `Processing notification.send: to ${payload.recipientId} ` +
        `via ${payload.channel} — "${payload.title}"`,
    );

    // Notification dispatch is handled by NotificationDispatcherService
    // via the existing event bus listeners. This handler is a placeholder
    // for cross-service notification delivery in a microservice setup.
    await Promise.resolve();
  }

  private async handleStockAlert(payload: StockAlertPayload): Promise<void> {
    this.logger.log(
      `Processing stock alert notification: product ${payload.productId} ` +
        `at outlet ${payload.outletId} (qty: ${payload.newQuantity})`,
    );

    // Stock alert notifications are handled by StockEventListener via
    // the RxJS bus. This handler is a placeholder for cross-service
    // alert aggregation and delivery.
    await Promise.resolve();
  }
}
