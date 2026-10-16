import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEvent } from '../../domain/events/domain-event';
import { EventBusService } from '../events/event-bus.service';
import { RabbitMqService } from './rabbitmq.service';
import { MessagePublisherService } from './message-publisher.service';
import { EXCHANGES } from './rabbitmq.config';

/**
 * Forwards every local RxJS domain event to RabbitMQ (if connected), so code that uses
 * EventBusService.publish() also distributes events across services. In-process listeners keep
 * consuming from the RxJS bus.
 *
 * The former RabbitMQ -> RxJS reverse bridge was removed (audit F1214): its `.bridge` queues were
 * never bound to any exchange and the reconstructed events never matched the listeners'
 * `instanceof` filters, so it could not deliver anything.
 */
@Injectable()
export class EventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EventBridgeService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly rabbitMqService: RabbitMqService,
    private readonly publisher: MessagePublisherService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMqService.isConfigured()) {
      this.logger.log('RabbitMQ not configured — event bridge disabled');
      return;
    }

    this.bridgeRxjsToRabbitMq();

    this.logger.log('Event bridge initialized — RxJS -> RabbitMQ');
  }

  // ---------------------------------------------------------------------------
  // RxJS -> RabbitMQ direction
  // ---------------------------------------------------------------------------

  private bridgeRxjsToRabbitMq(): void {
    this.eventBus.onAll().subscribe((event: DomainEvent) => {
      void this.publishToRabbitMqOnly(event);
    });

    this.logger.debug('RxJS -> RabbitMQ bridge active');
  }

  private async publishToRabbitMqOnly(event: DomainEvent): Promise<void> {
    if (!this.rabbitMqService.isConnected()) return;

    try {
      const published = await this.publisher.publishMessage(
        EXCHANGES.EVENTS,
        event.eventName,
        this.serializeEvent(event),
      );
      if (!published) {
        this.logger.warn(`Bridge: "${event.eventName}" not forwarded to RabbitMQ (buffer full)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Bridge: failed to forward "${event.eventName}" to RabbitMQ: ${errorMessage}`,
      );
    }
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
