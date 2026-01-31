import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainEvent } from '../../domain/events/domain-event';
import { EventBusService } from '../events/event-bus.service';
import { RabbitMqService } from './rabbitmq.service';
import { EXCHANGES } from './rabbitmq.config';
import type { MessageEnvelope, MessageMetadata } from './rabbitmq.types';

/**
 * High-level message publisher that wraps domain events into a standardized
 * envelope format and publishes them to RabbitMQ.
 *
 * Falls back to the local RxJS event bus when RabbitMQ is not available.
 */
@Injectable()
export class MessagePublisherService {
  private readonly logger = new Logger(MessagePublisherService.name);

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly eventBus: EventBusService,
  ) { }

  /**
   * Publishes a domain event to RabbitMQ. If RabbitMQ is not connected,
   * the event is published only to the local RxJS event bus.
   *
   * The event is always published to the local RxJS bus first (for in-process
   * listeners), then to RabbitMQ for cross-service distribution.
   */
  async publishEvent(event: DomainEvent): Promise<void> {
    // Always publish to local RxJS bus for backward compatibility
    this.eventBus.publish(event);

    // Attempt RabbitMQ publish if connected
    if (!this.rabbitMqService.isConnected()) {
      this.logger.debug(
        `RabbitMQ not connected — event "${event.eventName}" published to local bus only`,
      );
      return;
    }

    try {
      const envelope = this.createEnvelope(event);
      const buffer = Buffer.from(JSON.stringify(envelope));
      const routingKey = event.eventName;

      const published = await this.rabbitMqService.publish(
        EXCHANGES.EVENTS,
        routingKey,
        buffer,
        {
          correlationId: envelope.metadata.correlationId,
          timestamp: Date.now(),
          type: event.eventName,
          headers: {
            'x-event-type': event.eventName,
            'x-correlation-id': envelope.metadata.correlationId,
            'x-source': envelope.metadata.source,
          },
        },
      );

      if (published) {
        this.logger.debug(
          `Event "${event.eventName}" published to RabbitMQ [${envelope.metadata.correlationId}]`,
        );
      } else {
        this.logger.warn(
          `Event "${event.eventName}" failed to publish to RabbitMQ — local bus delivery only`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to publish event "${event.eventName}" to RabbitMQ: ${errorMessage}`,
      );
      // Event was already published to local bus, so it is not lost
    }
  }

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
      this.logger.warn(
        `RabbitMQ not connected — cannot publish to ${exchange}/${routingKey}`,
      );
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

  private createEnvelope(event: DomainEvent): MessageEnvelope {
    return {
      eventType: event.eventName,
      payload: this.serializeEvent(event),
      metadata: this.createMetadata(),
    };
  }

  private createMetadata(correlationId?: string): MessageMetadata {
    return {
      correlationId: correlationId ?? randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'tilo-backend',
      version: '1.0',
    };
  }

  private serializeEvent(event: DomainEvent): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    for (const key of Object.keys(event)) {
      const value: unknown = (event as unknown as Record<string, unknown>)[key];
      if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }
}
