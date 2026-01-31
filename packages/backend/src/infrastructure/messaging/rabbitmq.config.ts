/**
 * RabbitMQ exchange, queue, and routing key definitions for the TiloPOS system.
 *
 * Exchanges use topic type to allow flexible routing patterns.
 * Dead letter exchange (DLX) handles messages that fail processing.
 */

export const EXCHANGES = {
  /** Primary exchange for domain events (topic type) */
  EVENTS: 'tilo.events',
  /** Exchange for command messages (direct type) */
  COMMANDS: 'tilo.commands',
  /** Dead letter exchange for failed messages */
  DLX: 'tilo.dlx',
} as const;

export const QUEUES = {
  /** POS transaction processing */
  POS_TRANSACTIONS: 'pos.transactions',
  /** Inventory stock level updates */
  INVENTORY_STOCK: 'inventory.stock',
  /** KDS order routing and display */
  KDS_ORDERS: 'kds.orders',
  /** Customer loyalty point processing */
  CUSTOMERS_LOYALTY: 'customers.loyalty',
  /** Notification delivery */
  NOTIFICATIONS_SEND: 'notifications.send',
} as const;

export const ROUTING_KEYS = {
  /** Transaction lifecycle events */
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_VOIDED: 'transaction.voided',
  /** Payment events */
  PAYMENT_RECEIVED: 'payment.received',
  /** Stock events */
  STOCK_CHANGED: 'stock.level_changed',
  STOCK_TRANSFER_COMPLETED: 'stock.transfer_completed',
  /** Order events */
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  /** Notification events */
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

/**
 * Queue-to-routing-key bindings.
 * Each queue is bound to specific routing keys on the events exchange.
 */
export interface QueueBinding {
  readonly queue: QueueName;
  readonly exchange: ExchangeName;
  readonly routingKeys: readonly RoutingKey[];
}

export const QUEUE_BINDINGS: readonly QueueBinding[] = [
  {
    queue: QUEUES.POS_TRANSACTIONS,
    exchange: EXCHANGES.EVENTS,
    routingKeys: [
      ROUTING_KEYS.TRANSACTION_CREATED,
      ROUTING_KEYS.TRANSACTION_VOIDED,
      ROUTING_KEYS.PAYMENT_RECEIVED,
    ],
  },
  {
    queue: QUEUES.INVENTORY_STOCK,
    exchange: EXCHANGES.EVENTS,
    routingKeys: [
      ROUTING_KEYS.STOCK_CHANGED,
      ROUTING_KEYS.STOCK_TRANSFER_COMPLETED,
    ],
  },
  {
    queue: QUEUES.KDS_ORDERS,
    exchange: EXCHANGES.EVENTS,
    routingKeys: [
      ROUTING_KEYS.ORDER_CREATED,
      ROUTING_KEYS.ORDER_STATUS_CHANGED,
    ],
  },
  {
    queue: QUEUES.CUSTOMERS_LOYALTY,
    exchange: EXCHANGES.EVENTS,
    routingKeys: [
      ROUTING_KEYS.TRANSACTION_CREATED,
      ROUTING_KEYS.TRANSACTION_VOIDED,
    ],
  },
  {
    queue: QUEUES.NOTIFICATIONS_SEND,
    exchange: EXCHANGES.EVENTS,
    routingKeys: [
      ROUTING_KEYS.NOTIFICATION_SEND,
      ROUTING_KEYS.STOCK_CHANGED,
    ],
  },
] as const;
