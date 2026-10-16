import { Prisma } from '@prisma/client';
import { PaymentWebhookProcessor } from '../payment-webhook.processor';
import type { PrismaService } from '../../../../infrastructure/database/prisma.service';

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    transactionId: 'tx-1',
    paymentMethod: 'qris',
    amount: new Prisma.Decimal('50000'),
    referenceNumber: 'qris:qr_123',
    status: 'pending',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    transaction: {
      id: 'tx-1',
      outletId: 'outlet-1',
      grandTotal: new Prisma.Decimal('50000'),
      outlet: { businessId: 'biz-1' },
    },
    ...overrides,
  };
}

function makePrisma(payment: ReturnType<typeof makePayment> | null) {
  const tx = {
    payment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ status: 'completed', amount: new Prisma.Decimal('50000') }]),
    },
    transaction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    payment: {
      findFirst: jest.fn().mockResolvedValue(payment),
      findMany: jest.fn().mockResolvedValue(payment ? [payment] : []),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as unknown[]),
    ),
  };
  return { prisma, tx };
}

describe('PaymentWebhookProcessor', () => {
  it('does not complete a payment when the gateway amount differs, and flags it', async () => {
    const { prisma, tx } = makePrisma(makePayment());
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);

    const result = await processor.process({
      provider: 'xendit',
      reference: PAYMENT_ID,
      outcome: 'completed',
      amount: 5000,
    });

    expect(result.code).toBe('amount_mismatch');
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.transaction.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'payment_amount_mismatch', businessId: 'biz-1' }),
      }),
    );
    const flag = prisma.payment.updateMany.mock.calls[0][0].data.metadata.amountMismatch;
    expect(flag).toMatchObject({ expected: '50000', received: '5000' });
  });

  it('treats a missing amount as a mismatch', async () => {
    const { prisma } = makePrisma(makePayment());
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);
    const result = await processor.process({
      provider: 'midtrans',
      reference: PAYMENT_ID,
      outcome: 'completed',
      amount: null,
    });
    expect(result.code).toBe('amount_mismatch');
  });

  it('completes the payment with a conditional update and completes a fully paid sale', async () => {
    const { prisma, tx } = makePrisma(makePayment());
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);

    const result = await processor.process({
      provider: 'midtrans',
      reference: PAYMENT_ID,
      outcome: 'completed',
      amount: '50000.00',
    });

    expect(result.code).toBe('applied');
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PAYMENT_ID, status: { in: ['pending', 'failed'] } },
      }),
    );
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: { in: ['pending', 'partially_paid'] } },
      data: { status: 'completed' },
    });
  });

  it('is idempotent: a concurrent duplicate that loses the conditional update changes nothing', async () => {
    const { prisma, tx } = makePrisma(makePayment());
    tx.payment.updateMany.mockResolvedValue({ count: 0 });
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);

    const result = await processor.process({
      provider: 'xendit',
      reference: PAYMENT_ID,
      outcome: 'completed',
      amount: 50000,
    });

    expect(result.code).toBe('duplicate');
    expect(tx.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a redelivered paid notification for an already completed payment', async () => {
    const { prisma } = makePrisma(makePayment({ status: 'completed' }));
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);
    const result = await processor.process({
      provider: 'xendit',
      reference: PAYMENT_ID,
      outcome: 'completed',
      amount: 50000,
    });
    expect(result.code).toBe('duplicate');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not complete the sale while another payment is still pending', async () => {
    const { prisma, tx } = makePrisma(makePayment());
    tx.payment.findMany.mockResolvedValue([
      { status: 'completed', amount: new Prisma.Decimal('50000') },
      { status: 'pending', amount: new Prisma.Decimal('10000') },
    ]);
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);
    await processor.process({
      provider: 'xendit',
      reference: PAYMENT_ID,
      outcome: 'completed',
      amount: 50000,
    });
    expect(tx.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('a late failure only fails a pending payment and never voids the transaction', async () => {
    const { prisma } = makePrisma(makePayment({ status: 'completed' }));
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);

    const result = await processor.process({
      provider: 'xendit',
      reference: PAYMENT_ID,
      outcome: 'failed',
      amount: null,
    });

    expect(result.code).toBe('duplicate');
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PAYMENT_ID, status: 'pending' } }),
    );
  });

  it('records a partial refund without marking the payment refunded', async () => {
    const { prisma } = makePrisma(makePayment({ status: 'completed' }));
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);

    const result = await processor.process({
      provider: 'xendit',
      reference: PAYMENT_ID,
      outcome: 'refunded',
      amount: 10000,
      gatewayRef: 'rfd_1',
    });

    expect(result.code).toBe('applied');
    const data = prisma.payment.updateMany.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
    expect(data.metadata.gatewayRefunds).toHaveLength(1);
  });

  it('returns not_found for an unknown reference and refuses ambiguous fallbacks', async () => {
    const { prisma } = makePrisma(null);
    prisma.payment.findMany.mockResolvedValue([makePayment(), makePayment({ id: 'other' })]);
    const processor = new PaymentWebhookProcessor(prisma as unknown as PrismaService);
    const result = await processor.process({
      provider: 'xendit',
      reference: 'invoice:abc',
      outcome: 'completed',
      amount: 50000,
    });
    expect(result.code).toBe('not_found');
  });
});
