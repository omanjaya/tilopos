/**
 * RabbitMQ environment variable keys and default values.
 */
export const RABBITMQ_ENV = {
  URL: 'RABBITMQ_URL',
  EXCHANGE: 'RABBITMQ_EXCHANGE',
  QUEUE_PREFIX: 'RABBITMQ_QUEUE_PREFIX',
  RETRY_ATTEMPTS: 'RABBITMQ_RETRY_ATTEMPTS',
  RETRY_DELAY: 'RABBITMQ_RETRY_DELAY',
} as const;

export const RABBITMQ_DEFAULTS = {
  EXCHANGE: 'tilo.events',
  QUEUE_PREFIX: 'tilo',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000,
} as const;
