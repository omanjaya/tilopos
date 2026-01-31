/**
 * Type definitions for RabbitMQ messaging layer.
 *
 * These types provide a thin abstraction over amqplib so the rest of the
 * codebase does not directly depend on amqplib types. This allows graceful
 * degradation when amqplib is not installed.
 */

/** Represents an AMQP connection (abstraction over amqplib.Connection) */
export interface AmqpConnection {
  createChannel(): Promise<AmqpChannel>;
  close(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

/** Represents an AMQP channel (abstraction over amqplib.Channel) */
export interface AmqpChannel {
  assertExchange(
    exchange: string,
    type: string,
    options?: Record<string, unknown>,
  ): Promise<{ exchange: string }>;
  assertQueue(
    queue: string,
    options?: Record<string, unknown>,
  ): Promise<{ queue: string; messageCount: number; consumerCount: number }>;
  bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<Record<string, unknown>>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options?: Record<string, unknown>,
  ): boolean;
  consume(
    queue: string,
    onMessage: (msg: AmqpMessage | null) => void,
    options?: Record<string, unknown>,
  ): Promise<{ consumerTag: string }>;
  ack(message: AmqpMessage): void;
  nack(message: AmqpMessage, allUpTo?: boolean, requeue?: boolean): void;
  prefetch(count: number): Promise<void>;
  close(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

/** Represents an AMQP message (abstraction over amqplib.ConsumeMessage) */
export interface AmqpMessage {
  content: Buffer;
  fields: {
    routingKey: string;
    exchange: string;
    deliveryTag: number;
    redelivered: boolean;
  };
  properties: {
    correlationId?: string;
    headers?: Record<string, unknown>;
    messageId?: string;
    timestamp?: number;
    type?: string;
    contentType?: string;
  };
}

/** amqplib module shape for dynamic import */
export interface AmqpLib {
  connect(url: string): Promise<AmqpConnection>;
}

/** Serialized message envelope sent via RabbitMQ */
export interface MessageEnvelope {
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly metadata: MessageMetadata;
}

/** Metadata attached to every message */
export interface MessageMetadata {
  readonly correlationId: string;
  readonly timestamp: string;
  readonly source: string;
  readonly version: string;
}

/** Handler function signature for consuming messages */
export type MessageHandler = (
  envelope: MessageEnvelope,
  rawMessage: AmqpMessage,
) => Promise<void>;

/** Connection status for health checks */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
