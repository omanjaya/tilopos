import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageConsumerService } from '../message-consumer.service';
import { QUEUES, ROUTING_KEYS } from '../rabbitmq.config';
import type { MessageEnvelope, AmqpMessage } from '../rabbitmq.types';

/**
 * Payload shape for order.created events.
 */
interface OrderCreatedPayload {
  readonly orderId: string;
  readonly outletId: string;
  readonly tableId: string | null;
  readonly itemCount: number;
}

/**
 * Payload shape for order.status_changed events.
 */
interface OrderStatusChangedPayload {
  readonly orderId: string;
  readonly outletId: string;
  readonly previousStatus: string;
  readonly newStatus: string;
}

/**
 * Handles KDS (Kitchen Display System) related messages from the orders queue:
 * - order.created -> Route order to the appropriate KDS station
 * - order.status_changed -> Update KDS display with new status
 */
@Injectable()
export class KdsQueueHandler implements OnModuleInit {
  private readonly logger = new Logger(KdsQueueHandler.name);

  constructor(private readonly consumer: MessageConsumerService) {}

  onModuleInit(): void {
    this.consumer.registerHandler(
      QUEUES.KDS_ORDERS,
      (envelope: MessageEnvelope, rawMessage: AmqpMessage) => this.handle(envelope, rawMessage),
    );
  }

  private async handle(envelope: MessageEnvelope, _rawMessage: AmqpMessage): Promise<void> {
    switch (envelope.eventType) {
      case ROUTING_KEYS.ORDER_CREATED:
        await this.handleOrderCreated(envelope.payload as unknown as OrderCreatedPayload);
        break;
      case ROUTING_KEYS.ORDER_STATUS_CHANGED:
        await this.handleOrderStatusChanged(
          envelope.payload as unknown as OrderStatusChangedPayload,
        );
        break;
      default:
        this.logger.warn(`KdsQueueHandler: unhandled event type "${envelope.eventType}"`);
    }
  }

  private async handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    this.logger.log(
      `Processing order.created for KDS: order ${payload.orderId} ` +
        `at outlet ${payload.outletId} (table: ${payload.tableId ?? 'takeaway'}, items: ${payload.itemCount})`,
    );

    // In a microservice architecture, this would push the order to the
    // KDS WebSocket gateway. Currently, KDS routing is handled in-process
    // by the KDS module. This handler is a placeholder for cross-service
    // KDS station assignment.
    await Promise.resolve();
  }

  private async handleOrderStatusChanged(payload: OrderStatusChangedPayload): Promise<void> {
    this.logger.log(
      `Processing order.status_changed for KDS: order ${payload.orderId} ` +
        `(${payload.previousStatus} -> ${payload.newStatus})`,
    );

    // KDS display updates are handled via WebSocket in the KDS module.
    // This handler is a placeholder for cross-service status propagation.
    await Promise.resolve();
  }
}
