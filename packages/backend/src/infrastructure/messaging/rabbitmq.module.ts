import { Global, Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import { MessagePublisherService } from './message-publisher.service';
import { MessageConsumerService } from './message-consumer.service';
import { EventBridgeService } from './event-bridge.service';
import { RabbitMqHealthIndicator } from './rabbitmq.health';
import { PosQueueHandler } from './queues/pos-queue.handler';
import { InventoryQueueHandler } from './queues/inventory-queue.handler';
import { KdsQueueHandler } from './queues/kds-queue.handler';
import { NotificationQueueHandler } from './queues/notification-queue.handler';

/**
 * RabbitMQ messaging module for the TiloPOS system.
 *
 * Provides:
 * - RabbitMqService: Low-level connection management, publishing, subscribing
 * - MessagePublisherService: High-level domain event publishing
 * - MessageConsumerService: High-level message consumption with error handling
 * - EventBridgeService: Bridges RxJS event bus <-> RabbitMQ for backward compatibility
 * - RabbitMqHealthIndicator: Health check for NestJS Terminus
 * - Queue handlers: Domain-specific message processors
 *
 * Behavior:
 * - If RABBITMQ_URL env var is set: Connects to RabbitMQ, sets up topology,
 *   starts consuming, and bridges events between RxJS and RabbitMQ.
 * - If RABBITMQ_URL is not set: Falls back entirely to the existing RxJS
 *   event bus. All services degrade gracefully with no errors.
 * - If amqplib is not installed: Same as no URL — graceful degradation.
 */
@Global()
@Module({
  providers: [
    RabbitMqService,
    MessagePublisherService,
    MessageConsumerService,
    EventBridgeService,
    RabbitMqHealthIndicator,
    PosQueueHandler,
    InventoryQueueHandler,
    KdsQueueHandler,
    NotificationQueueHandler,
  ],
  exports: [
    RabbitMqService,
    MessagePublisherService,
    MessageConsumerService,
    RabbitMqHealthIndicator,
  ],
})
export class RabbitMqModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(RabbitMqModule.name);

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly consumer: MessageConsumerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Connect to RabbitMQ (no-op if not configured)
    await this.rabbitMqService.connect();

    // Start consuming messages (no-op if not connected)
    if (this.rabbitMqService.isConnected()) {
      await this.consumer.startConsuming();
      this.logger.log(
        `RabbitMQ module bootstrapped — ${this.consumer.getHandlerCount()} handler(s) active`,
      );
    } else {
      this.logger.log(
        'RabbitMQ module bootstrapped — using RxJS event bus (RabbitMQ not available)',
      );
    }
  }
}
