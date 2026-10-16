import { Global, Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import { MessagePublisherService } from './message-publisher.service';
import { MessageConsumerService } from './message-consumer.service';
import { EventBridgeService } from './event-bridge.service';
import { RabbitMqHealthIndicator } from './rabbitmq.health';

/**
 * RabbitMQ messaging module for the TiloPOS system.
 *
 * Provides:
 * - RabbitMqService: Low-level connection management, publishing, subscribing
 * - MessagePublisherService: High-level domain event publishing
 * - MessageConsumerService: High-level message consumption with error handling
 * - EventBridgeService: Forwards local RxJS domain events to RabbitMQ
 * - RabbitMqHealthIndicator: Health check for NestJS Terminus
 * - Queue handlers: none registered today (no queue is bound, see rabbitmq.config.ts)
 *
 * Behavior:
 * - If RABBITMQ_URL env var is set: Connects to RabbitMQ, sets up topology,
 *   starts consuming, and forwards local domain events to RabbitMQ.
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

    if (!this.rabbitMqService.isConfigured()) {
      this.logger.log('RabbitMQ module bootstrapped — using RxJS event bus (RABBITMQ_URL not set)');
      return;
    }

    // Registers every consumer; queues that cannot be consumed yet are started after reconnect
    // and reported unhealthy until then.
    await this.consumer.startConsuming();
    const failed = this.rabbitMqService.getFailedSubscriptions();
    this.logger.log(
      `RabbitMQ module bootstrapped — ${this.consumer.getHandlerCount() - failed.length}/` +
        `${this.consumer.getHandlerCount()} handler(s) active` +
        (failed.length ? ` (pending: ${failed.join(', ')})` : ''),
    );
  }
}
