import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import type { AmqpMessage, MessageEnvelope, MessageHandler } from './rabbitmq.types';
import { AppError, ErrorCode } from '../../shared/errors/app-error';

/**
 * Registry entry for a queue handler.
 */
interface HandlerRegistration {
  readonly queue: string;
  readonly handler: MessageHandler;
  readonly retryLimit: number;
}

/**
 * High-level message consumer that handles deserialization, error handling,
 * retry logic, and dead-letter routing for RabbitMQ messages.
 *
 * Queue handlers register themselves through `registerHandler`, then
 * `startConsuming` activates all registered consumers.
 */
@Injectable()
export class MessageConsumerService {
  private readonly logger = new Logger(MessageConsumerService.name);
  private readonly handlers: HandlerRegistration[] = [];
  private consuming = false;

  constructor(private readonly rabbitMqService: RabbitMqService) {}

  /**
   * Registers a handler for a specific queue.
   *
   * @param queue - Queue name (without prefix — prefix is added automatically)
   * @param handler - Async handler that processes the deserialized message
   * @param retryLimit - Max times a message can be redelivered before going to DLX
   */
  registerHandler(queue: string, handler: MessageHandler, retryLimit = 3): void {
    this.handlers.push({ queue, handler, retryLimit });
    this.logger.log(`Handler registered for queue: ${queue}`);
  }

  /**
   * Starts consuming messages for all registered handlers.
   * If RabbitMQ is not connected, this is a no-op.
   */
  async startConsuming(): Promise<void> {
    if (this.consuming) {
      this.logger.warn('Already consuming — skipping duplicate start');
      return;
    }

    if (!this.rabbitMqService.isConnected()) {
      this.logger.log(
        'RabbitMQ not connected — message consumers will not start (using RxJS event bus)',
      );
      return;
    }

    this.consuming = true;

    for (const registration of this.handlers) {
      await this.rabbitMqService.subscribe(registration.queue, (msg: AmqpMessage) =>
        this.processMessage(registration, msg),
      );
    }

    this.logger.log(`Started consuming from ${this.handlers.length} queue(s)`);
  }

  /**
   * Returns the number of registered handlers (useful for diagnostics).
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async processMessage(
    registration: HandlerRegistration,
    rawMessage: AmqpMessage,
  ): Promise<void> {
    const { queue, handler, retryLimit } = registration;
    let envelope: MessageEnvelope;

    try {
      envelope = this.deserialize(rawMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to deserialize message from ${queue}: ${errorMessage}`);
      // Cannot parse — send directly to DLX (don't requeue malformed messages)
      this.rabbitMqService.nack(rawMessage, false);
      return;
    }

    try {
      await handler(envelope, rawMessage);
      this.rabbitMqService.ack(rawMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const deliveryCount = this.getDeliveryCount(rawMessage);

      this.logger.error(
        `Error processing "${envelope.eventType}" from ${queue} ` +
          `(attempt ${deliveryCount}/${retryLimit}): ${errorMessage}`,
      );

      if (deliveryCount >= retryLimit) {
        this.logger.warn(
          `Message "${envelope.eventType}" exceeded retry limit (${retryLimit}) — routing to DLX`,
        );
        // Reject without requeue: goes to dead-letter exchange
        this.rabbitMqService.nack(rawMessage, false);
      } else {
        // Requeue for retry
        this.rabbitMqService.nack(rawMessage, true);
      }
    }
  }

  private deserialize(rawMessage: AmqpMessage): MessageEnvelope {
    const content = rawMessage.content.toString('utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;

    // Validate envelope shape
    if (
      typeof parsed['eventType'] !== 'string' ||
      !parsed['payload'] ||
      typeof parsed['payload'] !== 'object'
    ) {
      throw new AppError(
        'Invalid message envelope: missing eventType or payload',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    return parsed as unknown as MessageEnvelope;
  }

  private getDeliveryCount(rawMessage: AmqpMessage): number {
    const headers = rawMessage.properties.headers;
    if (!headers) return 1;

    const deathHeader = headers['x-death'] as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(deathHeader) && deathHeader.length > 0) {
      const firstDeath = deathHeader[0];
      const count = firstDeath?.['count'];
      return typeof count === 'number' ? count : 1;
    }

    return rawMessage.fields.redelivered ? 2 : 1;
  }
}
