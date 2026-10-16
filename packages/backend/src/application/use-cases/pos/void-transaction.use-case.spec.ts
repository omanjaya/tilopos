import { Prisma } from '@prisma/client';
import { VoidTransactionUseCase, type VoidTransactionInput } from './void-transaction.use-case';
import type { EventBusService } from '@infrastructure/events/event-bus.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import { TransactionVoidedEvent } from '@domain/events/transaction-voided.event';
import { VoidNotAllowedException } from '@domain/exceptions/void-not-allowed.exception';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';

const D = (v: number) => new Prisma.Decimal(v);

describe('VoidTransactionUseCase', () => {
  let useCase: VoidTransactionUseCase;
  let prisma: { transaction: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let tx: {
    transaction: { updateMany: jest.Mock };
    payment: { updateMany: jest.Mock };
    stockMovement: { findMany: jest.Mock; createMany: jest.Mock };
    $queryRaw: jest.Mock;
    auditLog: { create: jest.Mock };
  };
  let eventBus: { publish: jest.Mock };

  const sale = (over: Record<string, unknown> = {}) => ({
    id: 'txn-1',
    outletId: 'outlet-1',
    status: 'completed',
    transactionType: 'sale',
    grandTotal: D(55500),
    shift: { status: 'open' },
    payments: [{ status: 'completed', metadata: {} }],
    ...over,
  });
  const input: VoidTransactionInput = {
    transactionId: 'txn-1',
    employeeId: 'sup-1',
    businessId: 'biz-1',
    reason: 'Wrong order',
  };

  beforeEach(() => {
    tx = {
      transaction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      stockMovement: {
        // regular item + two bundle components, recorded once each at sale time
        findMany: jest.fn().mockResolvedValue([
          { productId: 'p-1', variantId: null, quantity: D(-2) },
          { productId: 'p-a', variantId: null, quantity: D(-4) },
          { productId: 'p-b', variantId: null, quantity: D(-2) },
        ]),
        createMany: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'sl', quantity: D(10) }]),
      auditLog: { create: jest.fn() },
    };
    prisma = {
      transaction: { findFirst: jest.fn().mockResolvedValue(sale()) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    eventBus = { publish: jest.fn() };
    useCase = new VoidTransactionUseCase(
      eventBus as unknown as EventBusService,
      prisma as unknown as PrismaService,
    );
  });

  it('voids with a conditional status update scoped to the business', async () => {
    await useCase.execute(input);
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'txn-1', outlet: { businessId: 'biz-1' } } }),
    );
    expect(tx.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'txn-1',
          outlet: { businessId: 'biz-1' },
          status: { in: ['completed', 'pending'] },
        },
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(TransactionVoidedEvent));
  });

  it('a concurrent second void fails instead of restoring stock twice', async () => {
    tx.transaction.updateMany.mockResolvedValue({ count: 0 });
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(VoidNotAllowedException);
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
  });

  it('restores each original stock movement exactly once (bundles included)', async () => {
    await useCase.execute(input);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    const movements = tx.stockMovement.createMany.mock.calls[0][0].data;
    expect(
      movements.map((m: { productId: string; quantity: Prisma.Decimal }) => [
        m.productId,
        m.quantity.toNumber(),
      ]),
    ).toEqual([
      ['p-1', 2],
      ['p-a', 4],
      ['p-b', 2],
    ]);
  });

  it('marks the recorded payments as no longer collected', async () => {
    await useCase.execute(input);
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { transactionId: 'txn-1', status: 'completed' },
      data: { status: 'refunded' },
    });
  });

  it('refuses to void a sale whose shift is closed', async () => {
    prisma.transaction.findFirst.mockResolvedValue(sale({ shift: { status: 'closed' } }));
    await expect(useCase.execute(input)).rejects.toThrow(/process a refund instead/);
  });

  it('refuses to void a captured gateway payment', async () => {
    prisma.transaction.findFirst.mockResolvedValue(
      sale({ payments: [{ status: 'completed', metadata: { gatewayRef: 'invoice:1' } }] }),
    );
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(VoidNotAllowedException);
  });

  it('404s for another tenant', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(TransactionNotFoundException);
  });

  it('rejects refunded and credit transactions', async () => {
    prisma.transaction.findFirst.mockResolvedValue(sale({ status: 'refunded' }));
    await expect(useCase.execute(input)).rejects.toThrow('Cannot void a refunded transaction');
    prisma.transaction.findFirst.mockResolvedValue(sale({ status: 'credit' }));
    await expect(useCase.execute(input)).rejects.toThrow(/status credit/);
  });
});
