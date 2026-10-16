/**
 * RabbitMQ exchange, queue, and routing key definitions for the TiloPOS system.
 *
 * Exchanges use topic type to allow flexible routing patterns.
 * Dead letter exchange (DLX) handles messages that fail processing.
 *
 * Only queues that have a registered consumer are declared and bound: a bound queue without
 * a consumer accumulates every message forever (audit F1222). Routing keys are the
 * DomainEvent.eventName values published by the event bridge.
 */

export const EXCHANGES = {
  /** Primary exchange for domain events (topic type) */
  EVENTS: 'tilo.events',
  /** Exchange for command messages (direct type) */
  COMMANDS: 'tilo.commands',
  /** Dead letter exchange for failed messages */
  DLX: 'tilo.dlx',
} as const;

/** Work queues. Empty: declare a queue only together with its consumer (see QUEUE_BINDINGS). */
export const QUEUES = {} as const;

export const ROUTING_KEYS = {
  /** Transaction lifecycle events */
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_VOIDED: 'transaction.voided',
  /** Payment events */
  PAYMENT_RECEIVED: 'payment.received',
} as const;

export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

/** Upper bounds so a stalled consumer can never exhaust broker memory/disk. */
export const QUEUE_MAX_LENGTH = 100_000;
export const DEAD_LETTER_MAX_LENGTH = 100_000;
export const DEAD_LETTER_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Arguments for work queues: failed messages go to the DLX, length is capped. */
export function queueArguments(): Record<string, unknown> {
  return {
    'x-dead-letter-exchange': EXCHANGES.DLX,
    'x-max-length': QUEUE_MAX_LENGTH,
  };
}

export const DEAD_LETTER_QUEUE_ARGS: Record<string, unknown> = {
  'x-max-length': DEAD_LETTER_MAX_LENGTH,
  'x-message-ttl': DEAD_LETTER_TTL_MS,
};

/**
 * Queue-to-routing-key bindings.
 * Each queue is bound to specific routing keys on the events exchange.
 */
export interface QueueBinding {
  readonly queue: QueueName;
  readonly exchange: ExchangeName;
  readonly routingKeys: readonly RoutingKey[];
}

/**
 * No queue is bound at the moment: every side effect of the domain events runs in-process
 * (TransactionEventListener etc.), and the former POS mirror queue only had a drain-only
 * consumer (handoff 211). Events are still published to the topic exchange for future
 * cross-service consumers; add a binding together with a real consumer.
 */
export const QUEUE_BINDINGS: readonly QueueBinding[] = [];
