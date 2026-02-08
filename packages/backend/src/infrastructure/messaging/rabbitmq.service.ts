import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RABBITMQ_ENV, RABBITMQ_DEFAULTS } from './rabbitmq.constants';
import { EXCHANGES, QUEUE_BINDINGS } from './rabbitmq.config';
import type {
  AmqpConnection,
  AmqpChannel,
  AmqpLib,
  AmqpMessage,
  ConnectionStatus,
} from './rabbitmq.types';

/**
 * Core RabbitMQ service providing low-level connection management,
 * publishing, and subscribing capabilities.
 *
 * Features:
 * - Auto-retry connection with configurable attempts and delay
 * - Auto-reconnect on unexpected disconnection
 * - Graceful shutdown on module destroy
 * - Health check support via connection status
 * - Graceful degradation when amqplib is not installed
 */
@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);

  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;
  private amqpLib: AmqpLib | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private isShuttingDown = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly url: string | undefined;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly queuePrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>(RABBITMQ_ENV.URL);
    this.retryAttempts = this.configService.get<number>(
      RABBITMQ_ENV.RETRY_ATTEMPTS,
      RABBITMQ_DEFAULTS.RETRY_ATTEMPTS,
    );
    this.retryDelay = this.configService.get<number>(
      RABBITMQ_ENV.RETRY_DELAY,
      RABBITMQ_DEFAULTS.RETRY_DELAY,
    );
    this.queuePrefix = this.configService.get<string>(
      RABBITMQ_ENV.QUEUE_PREFIX,
      RABBITMQ_DEFAULTS.QUEUE_PREFIX,
    );
  }

  /**
   * Returns whether RabbitMQ is configured (RABBITMQ_URL env var is set).
   */
  isConfigured(): boolean {
    return !!this.url;
  }

  /**
   * Returns the current connection status for health checks.
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Returns true if the connection is active and ready to use.
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.channel !== null;
  }

  /**
   * Establishes a connection to RabbitMQ with retry logic.
   * Sets up exchanges, queues, and bindings as defined in rabbitmq.config.
   *
   * Does nothing if RABBITMQ_URL is not configured.
   */
  async connect(): Promise<void> {
    if (!this.url) {
      this.logger.log('RABBITMQ_URL not configured — RabbitMQ disabled, using RxJS event bus only');
      return;
    }

    if (!(await this.loadAmqpLib())) {
      return;
    }

    this.connectionStatus = 'connecting';

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.establishConnection();
        await this.setupTopology();
        this.connectionStatus = 'connected';
        this.logger.log('RabbitMQ connection established successfully');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `RabbitMQ connection attempt ${attempt}/${this.retryAttempts} failed: ${message}`,
        );

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    this.connectionStatus = 'error';
    this.logger.error(
      `Failed to connect to RabbitMQ after ${this.retryAttempts} attempts — falling back to RxJS event bus`,
    );
  }

  /**
   * Publishes a message to the specified exchange with a routing key.
   *
   * @returns true if the message was published, false if RabbitMQ is not connected
   */
  async publish(
    exchange: string,
    routingKey: string,
    message: Buffer,
    options?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.channel) {
      return false;
    }

    try {
      const success = this.channel.publish(exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        ...options,
      });

      if (!success) {
        this.logger.warn(`Channel write buffer full for ${exchange}/${routingKey}`);
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish to ${exchange}/${routingKey}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Subscribes to a queue with a handler function.
   * The handler receives the raw AmqpMessage for manual ack/nack.
   *
   * @param queue - Queue name (will be prefixed automatically)
   * @param handler - Callback invoked for each message
   */
  async subscribe(queue: string, handler: (message: AmqpMessage) => Promise<void>): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`Cannot subscribe to ${queue}: RabbitMQ not connected`);
      return;
    }

    const prefixedQueue = this.getPrefixedQueueName(queue);

    try {
      // Assert queue exists before consuming (auto-creates if missing)
      await this.channel.assertQueue(prefixedQueue, {
        durable: true,
        arguments: { 'x-dead-letter-exchange': 'tilo.dlx' },
      });
      await this.channel.prefetch(10);
      await this.channel.consume(
        prefixedQueue,
        (msg: AmqpMessage | null) => {
          if (!msg) return;
          handler(msg).catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error processing message from ${prefixedQueue}: ${errorMessage}`);
          });
        },
        { noAck: false },
      );
      this.logger.log(`Subscribed to queue: ${prefixedQueue}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to subscribe to ${prefixedQueue}: ${errorMessage}`);
    }
  }

  /**
   * Acknowledges a message (removes it from the queue).
   */
  ack(message: AmqpMessage): void {
    if (this.channel) {
      this.channel.ack(message);
    }
  }

  /**
   * Negatively acknowledges a message.
   * @param requeue - If true, requeues the message; if false, sends to DLX
   */
  nack(message: AmqpMessage, requeue = false): void {
    if (this.channel) {
      this.channel.nack(message, false, requeue);
    }
  }

  /**
   * Gracefully closes the RabbitMQ connection.
   */
  async close(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.connectionStatus = 'disconnected';
      this.logger.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during RabbitMQ shutdown: ${errorMessage}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  /**
   * Returns the prefixed queue name.
   */
  getPrefixedQueueName(queue: string): string {
    return `${this.queuePrefix}.${queue}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async loadAmqpLib(): Promise<boolean> {
    try {
      // Dynamic import so the system works without amqplib installed
      const lib = (await import('amqplib')) as unknown as AmqpLib;
      this.amqpLib = lib;
      return true;
    } catch {
      this.logger.warn(
        'amqplib package not installed — RabbitMQ disabled, using RxJS event bus only. ' +
          'Install with: npm install amqplib @types/amqplib',
      );
      this.connectionStatus = 'disconnected';
      return false;
    }
  }

  private async establishConnection(): Promise<void> {
    if (!this.amqpLib || !this.url) {
      throw new Error('amqplib not loaded or URL not configured');
    }

    this.connection = await this.amqpLib.connect(this.url);
    this.channel = await this.connection.createChannel();

    // Handle connection events
    this.connection.on('close', () => {
      if (!this.isShuttingDown) {
        this.logger.warn('RabbitMQ connection closed unexpectedly — attempting reconnect');
        this.connectionStatus = 'disconnected';
        this.channel = null;
        this.connection = null;
        void this.scheduleReconnect();
      }
    });

    this.connection.on('error', (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`RabbitMQ connection error: ${errorMessage}`);
      this.connectionStatus = 'error';
    });

    // Handle channel events
    this.channel.on('close', () => {
      if (!this.isShuttingDown) {
        this.logger.warn('RabbitMQ channel closed unexpectedly');
        this.channel = null;
      }
    });

    this.channel.on('error', (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`RabbitMQ channel error: ${errorMessage}`);
    });
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) return;

    // Assert exchanges
    await this.channel.assertExchange(EXCHANGES.EVENTS, 'topic', { durable: true });
    await this.channel.assertExchange(EXCHANGES.COMMANDS, 'direct', { durable: true });
    await this.channel.assertExchange(EXCHANGES.DLX, 'fanout', { durable: true });

    // Assert dead letter queue
    const dlqName = `${this.queuePrefix}.dead-letter`;
    await this.channel.assertQueue(dlqName, { durable: true });
    await this.channel.bindQueue(dlqName, EXCHANGES.DLX, '');

    // Assert queues and bind routing keys
    for (const binding of QUEUE_BINDINGS) {
      const prefixedQueue = this.getPrefixedQueueName(binding.queue);

      await this.channel.assertQueue(prefixedQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGES.DLX,
        },
      });

      for (const routingKey of binding.routingKeys) {
        await this.channel.bindQueue(prefixedQueue, binding.exchange, routingKey);
      }

      this.logger.debug(
        `Queue ${prefixedQueue} bound to ${binding.exchange} with keys: ${binding.routingKeys.join(', ')}`,
      );
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.isShuttingDown) return;

    this.reconnectTimer = setTimeout(() => {
      this.logger.log('Attempting RabbitMQ reconnection...');
      void this.connect();
    }, this.retryDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
