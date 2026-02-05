import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEvent } from '../../domain/events/domain-event';
import { EventBusService } from '../events/event-bus.service';
import { RabbitMqService } from './rabbitmq.service';
import { MessagePublisherService } from './message-publisher.service';
import { MessageConsumerService } from './message-consumer.service';
import type { MessageEnvelope, AmqpMessage } from './rabbitmq.types';
import { QUEUES } from './rabbitmq.config';

/**
 * Reconstructed domain event from a RabbitMQ message.
 * Used when bridging RabbitMQ messages back to the local RxJS bus.
 */
class ReconstructedDomainEvent extends DomainEvent {
  constructor(
    private readonly _eventName: string,
    public readonly payload: Record<string, unknown>,
  ) {
    super();
    if (payload['occurredOn'] && typeof payload['occurredOn'] === 'string') {
      (this as { occurredOn: Date }).occurredOn = new Date(payload['occurredOn']);
    }
  }

  get eventName(): string {
    return this._eventName;
  }
}

/**
 * Bridges the existing RxJS event bus and RabbitMQ messaging.
 *
 * On bootstrap:
 * 1. Subscribes to ALL local RxJS domain events and republishes them to RabbitMQ
 *    (if connected). This ensures any code that uses EventBusService.publish()
 *    also distributes events across services.
 *
 * 2. Registers RabbitMQ queue consumers that re-emit events on the local RxJS
 *    bus. This allows existing RxJS-based listeners to receive events from
 *    other services. A flag prevents infinite loops (RxJS -> RabbitMQ -> RxJS).
 *
 * This design maintains full backward compatibility: the application works
 * identically whether RabbitMQ is available or not.
 */
@Injectable()
export class EventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EventBridgeService.name);

  /**
   * Tracks events that originated from RabbitMQ to prevent re-publishing
   * them back (infinite loop prevention).
   */
  private readonly fromRabbitMq = new WeakSet<DomainEvent>();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly rabbitMqService: RabbitMqService,
    private readonly publisher: MessagePublisherService,
    private readonly consumer: MessageConsumerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMqService.isConfigured()) {
      this.logger.log('RabbitMQ not configured — event bridge disabled');
      return;
    }

    this.bridgeRxjsToRabbitMq();
    this.registerRabbitMqToRxjsBridge();

    this.logger.log('Event bridge initialized — RxJS <-> RabbitMQ');
  }

  // ---------------------------------------------------------------------------
  // RxJS -> RabbitMQ direction
  // ---------------------------------------------------------------------------

  private bridgeRxjsToRabbitMq(): void {
    this.eventBus.onAll().subscribe((event: DomainEvent) => {
      // Skip events that came from RabbitMQ to avoid infinite loop
      if (this.fromRabbitMq.has(event)) {
        return;
      }

      // The publisher already handles RabbitMQ connectivity checks
      // and publishes to RxJS first — but since the event is already
      // on the RxJS bus, we publish directly to RabbitMQ only.
      void this.publishToRabbitMqOnly(event);
    });

    this.logger.debug('RxJS -> RabbitMQ bridge active');
  }

  private async publishToRabbitMqOnly(event: DomainEvent): Promise<void> {
    if (!this.rabbitMqService.isConnected()) return;

    try {
      await this.publisher.publishMessage(
        'tilo.events',
        event.eventName,
        this.serializeEvent(event),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Bridge: failed to forward "${event.eventName}" to RabbitMQ: ${errorMessage}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // RabbitMQ -> RxJS direction
  // ---------------------------------------------------------------------------

  private registerRabbitMqToRxjsBridge(): void {
    // Register bridge handlers for key queues.
    // These re-emit RabbitMQ events onto the local RxJS bus so that
    // existing in-process listeners (TransactionEventListener, etc.)
    // can handle events from other services.

    const bridgeQueues = [
      QUEUES.POS_TRANSACTIONS,
      QUEUES.INVENTORY_STOCK,
      QUEUES.KDS_ORDERS,
      QUEUES.CUSTOMERS_LOYALTY,
      QUEUES.NOTIFICATIONS_SEND,
    ] as const;

    for (const queue of bridgeQueues) {
      // Use a dedicated bridge queue suffix to avoid competing with domain handlers
      const bridgeQueue = `${queue}.bridge`;
      this.consumer.registerHandler(
        bridgeQueue,
        (envelope: MessageEnvelope, _rawMessage: AmqpMessage) => this.reEmitToRxjs(envelope),
      );
    }

    this.logger.debug('RabbitMQ -> RxJS bridge handlers registered');
  }

  private async reEmitToRxjs(envelope: MessageEnvelope): Promise<void> {
    const event = new ReconstructedDomainEvent(envelope.eventType, envelope.payload);

    // Mark this event as originating from RabbitMQ
    this.fromRabbitMq.add(event);

    this.eventBus.publish(event);

    this.logger.debug(
      `Bridge: re-emitted "${envelope.eventType}" from RabbitMQ to local bus ` +
        `[${envelope.metadata.correlationId}]`,
    );
  }

  // ---------------------------------------------------------------------------
  // Serialization helper
  // ---------------------------------------------------------------------------

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
