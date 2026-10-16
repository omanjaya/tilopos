import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import type { AmqpMessage, MessageEnvelope, MessageHandler } from './rabbitmq.types';
import { AppError, ErrorCode } from '../../shared/errors/app-error';

export const RETRY_HEADER = 'x-retry-count';
const RETRY_BASE_DELAY_MS = 1000;

/** Number of retries already performed for this message (0 for the first delivery). */
export function getRetryCount(rawMessage: AmqpMessage): number {
  const value = rawMessage.properties.headers?.[RETRY_HEADER];
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

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
   * @param retryLimit - Max processing attempts before the message goes to the DLX
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

    if (!this.rabbitMqService.isConfigured()) {
      this.logger.log('RabbitMQ not configured — message consumers will not start');
      return;
    }

    this.consuming = true;

    for (const registration of this.handlers) {
      try {
        await this.rabbitMqService.subscribe(registration.queue, (msg: AmqpMessage) =>
          this.processMessage(registration, msg),
        );
      } catch (error) {
        // RabbitMqService logged it and flags the queue as failed (health check reports it);
        // keep starting the remaining consumers.
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Consumer for ${registration.queue} not started: ${errorMessage}`);
      }
    }
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
      const attempt = getRetryCount(rawMessage) + 1;

      this.logger.error(
        `Error processing "${envelope.eventType}" from ${queue} ` +
          `(attempt ${attempt}/${retryLimit}): ${errorMessage}`,
      );

      if (attempt >= retryLimit) {
        this.logger.warn(
          `Message "${envelope.eventType}" exceeded retry limit (${retryLimit}) — routing to DLX`,
        );
        // Reject without requeue: goes to dead-letter exchange
        this.rabbitMqService.nack(rawMessage, false);
        return;
      }

      // nack(requeue) does not count deliveries, so a failing message would loop forever.
      // Instead re-publish a copy with an incremented retry counter (after a backoff) and ack
      // the original.
      await this.delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      const republished = this.rabbitMqService.republishToQueue(queue, rawMessage, {
        [RETRY_HEADER]: attempt,
      });
      if (republished) {
        this.rabbitMqService.ack(rawMessage);
      } else {
        this.logger.error(
          `Could not re-publish "${envelope.eventType}" for retry — routing to DLX`,
        );
        this.rabbitMqService.nack(rawMessage, false);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
        ErrorCode.VALIDATION_ERROR,
        'Invalid message envelope: missing eventType or payload',
      );
    }

    return parsed as unknown as MessageEnvelope;
  }
}
