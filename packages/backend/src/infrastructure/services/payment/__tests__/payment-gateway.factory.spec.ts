import type { ConfigService } from '@nestjs/config';
import { PaymentGatewayFactory } from '../payment-gateway.factory';
import type { MidtransGateway } from '../midtrans-gateway';
import type { XenditGateway } from '../xendit/xendit-gateway';
import { MockPaymentGateway } from '../../mock-payment-gateway';

function makeFactory(env: Record<string, string | undefined>) {
  const config = { get: jest.fn((key: string) => env[key]) } as unknown as ConfigService;
  const midtrans = { name: 'midtrans' } as unknown as MidtransGateway;
  const xendit = { name: 'xendit' } as unknown as XenditGateway;
  const mock = new MockPaymentGateway();
  return {
    factory: new PaymentGatewayFactory(config, midtrans, xendit, mock),
    midtrans,
    xendit,
    mock,
  };
}

describe('PaymentGatewayFactory', () => {
  it('throws in production when the selected gateway has no key (never falls back to mock)', () => {
    const { factory } = makeFactory({ NODE_ENV: 'production', PAYMENT_GATEWAY: 'xendit' });
    expect(() => factory.getGateway()).toThrow(/not allowed/);
    const { factory: f2 } = makeFactory({ NODE_ENV: 'production', PAYMENT_GATEWAY: 'midtrans' });
    expect(() => f2.getGateway()).toThrow(/MIDTRANS_SERVER_KEY/);
  });

  it('throws when mock is selected in production or NODE_ENV is unset', () => {
    expect(() =>
      makeFactory({ NODE_ENV: 'production', PAYMENT_GATEWAY: 'mock' }).factory.getGateway(),
    ).toThrow();
    expect(() => makeFactory({ PAYMENT_GATEWAY: 'mock' }).factory.getGateway()).toThrow();
    expect(() => makeFactory({ NODE_ENV: 'staging' }).factory.getGateway()).toThrow();
  });

  it('returns the real gateway when configured', () => {
    const { factory, xendit } = makeFactory({
      NODE_ENV: 'production',
      PAYMENT_GATEWAY: 'xendit',
      XENDIT_API_KEY: 'k',
    });
    expect(factory.getGateway()).toBe(xendit);
  });

  it('uses the mock only in development/test', () => {
    const { factory, mock } = makeFactory({ NODE_ENV: 'development', PAYMENT_GATEWAY: 'mock' });
    expect(factory.getGateway()).toBe(mock);
    const { factory: f2, mock: m2 } = makeFactory({ NODE_ENV: 'test' });
    expect(f2.getGateway()).toBe(m2);
  });

  it('mock gateway refuses to run in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(
        new MockPaymentGateway().processPayment({ method: 'qris', amount: 1 }),
      ).rejects.toThrow();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
