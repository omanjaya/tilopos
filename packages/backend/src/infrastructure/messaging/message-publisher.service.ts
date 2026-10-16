import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RabbitMqService } from './rabbitmq.service';
import type { MessageEnvelope, MessageMetadata } from './rabbitmq.types';

/**
 * Publishes messages to RabbitMQ in the standard envelope format. Domain events reach RabbitMQ
 * through EventBridgeService (which forwards everything published on the local RxJS bus), so
 * there is deliberately no publishEvent() here — it would double-publish (audit F1216).
 */
@Injectable()
export class MessagePublisherService {
  private readonly logger = new Logger(MessagePublisherService.name);

  constructor(private readonly rabbitMqService: RabbitMqService) {}

  /**
   * Publishes a raw message to a specific exchange with a routing key.
   * This is useful for commands or messages that are not domain events.
   */
  async publishMessage(
    exchange: string,
    routingKey: string,
    payload: Record<string, unknown>,
    correlationId?: string,
  ): Promise<boolean> {
    if (!this.rabbitMqService.isConnected()) {
      this.logger.warn(`RabbitMQ not connected — cannot publish to ${exchange}/${routingKey}`);
      return false;
    }

    const metadata = this.createMetadata(correlationId);
    const envelope: MessageEnvelope = {
      eventType: routingKey,
      payload,
      metadata,
    };

    const buffer = Buffer.from(JSON.stringify(envelope));
    return this.rabbitMqService.publish(exchange, routingKey, buffer, {
      correlationId: metadata.correlationId,
      timestamp: Date.now(),
      type: routingKey,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private createMetadata(correlationId?: string): MessageMetadata {
    return {
      correlationId: correlationId ?? randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'tilo-backend',
      version: '1.0',
    };
  }
}
