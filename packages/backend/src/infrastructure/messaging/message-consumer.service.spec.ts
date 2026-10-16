import { MessageConsumerService, RETRY_HEADER } from './message-consumer.service';
import type { RabbitMqService } from './rabbitmq.service';
import type { AmqpMessage } from './rabbitmq.types';

function message(retryCount?: number): AmqpMessage {
  return {
    content: Buffer.from(JSON.stringify({ eventType: 'transaction.created', payload: { a: 1 } })),
    fields: {
      routingKey: 'transaction.created',
      exchange: 'tilo.events',
      deliveryTag: 1,
      redelivered: true,
    },
    properties: { headers: retryCount === undefined ? {} : { [RETRY_HEADER]: retryCount } },
  };
}

function build() {
  let consumerFn: ((msg: AmqpMessage) => Promise<void>) | undefined;
  const rabbit = {
    isConfigured: () => true,
    subscribe: jest.fn(async (_q: string, fn: (msg: AmqpMessage) => Promise<void>) => {
      consumerFn = fn;
    }),
    ack: jest.fn(),
    nack: jest.fn(),
    republishToQueue: jest.fn().mockReturnValue(true),
  };
  const service = new MessageConsumerService(rabbit as unknown as RabbitMqService);
  jest.spyOn(service as unknown as { delay: () => Promise<void> }, 'delay').mockResolvedValue();
  return { service, rabbit, deliver: (m: AmqpMessage) => consumerFn!(m) };
}

describe('MessageConsumerService retry', () => {
  it('re-publishes a failing message with an incremented retry counter (never nack-requeue)', async () => {
    const { service, rabbit, deliver } = build();
    service.registerHandler('pos.transactions', jest.fn().mockRejectedValue(new Error('x')), 3);
    await service.startConsuming();

    await deliver(message());
    expect(rabbit.republishToQueue).toHaveBeenCalledWith('pos.transactions', expect.anything(), {
      [RETRY_HEADER]: 1,
    });
    expect(rabbit.ack).toHaveBeenCalledTimes(1);
    expect(rabbit.nack).not.toHaveBeenCalledWith(expect.anything(), true);
  });

  it('dead-letters once the retry limit is reached', async () => {
    const { service, rabbit, deliver } = build();
    service.registerHandler('pos.transactions', jest.fn().mockRejectedValue(new Error('x')), 3);
    await service.startConsuming();

    await deliver(message(2)); // third attempt
    expect(rabbit.republishToQueue).not.toHaveBeenCalled();
    expect(rabbit.nack).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('acks on success', async () => {
    const { service, rabbit, deliver } = build();
    service.registerHandler('pos.transactions', jest.fn().mockResolvedValue(undefined));
    await service.startConsuming();

    await deliver(message());
    expect(rabbit.ack).toHaveBeenCalledTimes(1);
  });
});
