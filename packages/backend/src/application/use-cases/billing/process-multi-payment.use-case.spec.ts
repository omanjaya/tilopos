import { Prisma } from '@prisma/client';
import { ProcessMultiPaymentUseCase } from './process-multi-payment.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { IPaymentGateway } from '@domain/interfaces/services/payment-gateway';

const D = (v: number) => new Prisma.Decimal(v);

describe('ProcessMultiPaymentUseCase', () => {
  let prisma: {
    $transaction: jest.Mock;
    payment: { updateMany: jest.Mock };
    transaction: { findUniqueOrThrow: jest.Mock; updateMany: jest.Mock };
  };
  let tx: {
    $queryRaw: jest.Mock;
    transaction: { findFirst: jest.Mock };
    payment: { create: jest.Mock };
  };
  let gateway: jest.Mocked<IPaymentGateway>;
  let useCase: ProcessMultiPaymentUseCase;
  let created: Array<Record<string, unknown>>;

  beforeEach(() => {
    created = [];
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'txn-1' }]),
      transaction: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'txn-1',
          status: 'pending',
          grandTotal: D(100000),
          payments: [],
        }),
      },
      payment: {
        create: jest.fn().mockImplementation(({ data }) => {
          const row = {
            id: `pay-${created.length + 1}`,
            paymentMethod: data.paymentMethod,
            amount: data.amount,
            status: data.status,
            metadata: data.metadata,
          };
          created.push(row);
          return Promise.resolve(row);
        }),
      },
    };
    prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      transaction: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          status: 'pending',
          grandTotal: D(100000),
          payments: [{ amount: D(40000) }],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    gateway = {
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        transactionRef: 'qris:abc',
        paymentData: { paymentStatus: 'pending', qrString: 'xyz' },
      }),
      refundPayment: jest.fn(),
      checkStatus: jest.fn(),
    };
    useCase = new ProcessMultiPaymentUseCase(gateway, prisma as unknown as PrismaService);
  });

  it('keeps a non-cash payment pending until the gateway confirms it', async () => {
    const result = await useCase.execute({
      transactionId: 'txn-1',
      businessId: 'biz-1',
      payments: [
        { method: 'cash', amount: 40000 },
        { method: 'qris', amount: 60000 },
      ],
    });

    expect(tx.payment.create.mock.calls[1][0].data.status).toBe('pending');
    // gateway order id is our Payment.id
    expect(gateway.processPayment).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'qris', amount: 60000, referenceNumber: 'pay-2' }),
    );
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-2', status: 'pending' },
        data: expect.objectContaining({ status: 'pending', referenceNumber: 'qris:abc' }),
      }),
    );
    // only the 40k cash is confirmed -> partially paid, not completed
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'partially_paid' } }),
    );
    expect(result.transactionStatus).toBe('partially_paid');
    expect(result.paymentRecords[1]).toMatchObject({
      status: 'pending',
      paymentData: { qrString: 'xyz' },
    });
  });

  it('marks a declined charge failed', async () => {
    gateway.processPayment.mockResolvedValue({
      success: false,
      transactionRef: '',
      message: 'declined',
    });
    const result = await useCase.execute({
      transactionId: 'txn-1',
      businessId: 'biz-1',
      payments: [{ method: 'qris', amount: 100000 }],
    });
    expect(result.paymentRecords[0].status).toBe('failed');
  });

  it('keeps an unknown outcome (timeout) pending', async () => {
    gateway.processPayment.mockResolvedValue({
      success: false,
      transactionRef: '',
      paymentData: { paymentStatus: 'pending', outcomeUnknown: true },
    });
    const result = await useCase.execute({
      transactionId: 'txn-1',
      businessId: 'biz-1',
      payments: [{ method: 'qris', amount: 100000 }],
    });
    expect(result.paymentRecords[0].status).toBe('pending');
  });

  it('rejects payments on completed/refunded transactions', async () => {
    tx.transaction.findFirst.mockResolvedValue({
      id: 'txn-1',
      status: 'refunded',
      grandTotal: D(100000),
      payments: [],
    });
    await expect(
      useCase.execute({
        transactionId: 'txn-1',
        businessId: 'biz-1',
        payments: [{ method: 'cash', amount: 1 }],
      }),
    ).rejects.toThrow(/status: refunded/);
  });

  it('counts existing payments against the grand total', async () => {
    tx.transaction.findFirst.mockResolvedValue({
      id: 'txn-1',
      status: 'partially_paid',
      grandTotal: D(100000),
      payments: [{ id: 'p0', amount: D(70000), status: 'completed', metadata: {} }],
    });
    await expect(
      useCase.execute({
        transactionId: 'txn-1',
        businessId: 'biz-1',
        payments: [{ method: 'qris', amount: 50000 }],
      }),
    ).rejects.toThrow(/Non-cash payments cannot exceed/);
  });

  it('replays an idempotent retry without charging again', async () => {
    tx.transaction.findFirst.mockResolvedValue({
      id: 'txn-1',
      status: 'partially_paid',
      grandTotal: D(100000),
      payments: [
        {
          id: 'p0',
          paymentMethod: 'qris',
          amount: D(100000),
          status: 'pending',
          metadata: { idempotencyKey: 'k1' },
        },
      ],
    });
    const result = await useCase.execute({
      transactionId: 'txn-1',
      businessId: 'biz-1',
      idempotencyKey: 'k1',
      payments: [{ method: 'qris', amount: 100000 }],
    });
    expect(gateway.processPayment).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(result.paymentRecords[0].paymentId).toBe('p0');
  });

  it('404s for a transaction of another business', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(
      useCase.execute({
        transactionId: 'txn-1',
        businessId: 'other',
        payments: [{ method: 'cash', amount: 1 }],
      }),
    ).rejects.toThrow(/not found/);
  });
});
