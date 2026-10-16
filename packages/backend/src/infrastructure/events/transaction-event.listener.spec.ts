import { Prisma } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import { TransactionEventListener } from './transaction-event.listener';
import type { EventBusService } from './event-bus.service';
import type { PrismaService } from '../database/prisma.service';
import type { RedisService } from '../cache/redis.service';
import { computeLoyaltyPoints, tierForPoints } from '@application/services/loyalty-points';
import type { DeductIngredientsOnSaleUseCase } from '@application/use-cases/ingredients/deduct-ingredients-on-sale.use-case';

const D = (v: number) => new Prisma.Decimal(v);

describe('TransactionEventListener', () => {
  let tx: Record<string, Record<string, jest.Mock>> & {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let listener: TransactionEventListener;
  let ingredients: { execute: jest.Mock; restore: jest.Mock };

  const sale = (over: Record<string, unknown> = {}) => ({
    id: 'txn-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    customerId: 'cust-1',
    status: 'completed',
    transactionType: 'sale',
    grandTotal: D(55500),
    outlet: { businessId: 'biz-1' },
    items: [{ productId: 'prod-1', variantId: null, quantity: D(2) }],
    ...over,
  });

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      transaction: { findUnique: jest.fn().mockResolvedValue(sale()) },
      auditLog: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      recipe: {
        findMany: jest.fn().mockResolvedValue([
          {
            productId: 'prod-1',
            variantId: null,
            items: [{ ingredientId: 'ing-1', quantity: D(0.25) }],
          },
        ]),
      },
      ingredientStockLevel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ingredientStockMovement: { createMany: jest.fn(), findMany: jest.fn() },
      customer: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cust-1', isActive: true, loyaltyTier: 'Gold' }),
        update: jest.fn().mockResolvedValue({ loyaltyPoints: 700, loyaltyTier: 'Gold' }),
      },
      loyaltyProgram: {
        findFirst: jest.fn().mockResolvedValue({ amountPerPoint: D(1000), pointExpiryDays: null }),
      },
      loyaltyTier: {
        findMany: jest.fn().mockResolvedValue([
          { name: 'Silver', minPoints: 100, pointMultiplier: D(1) },
          { name: 'Gold', minPoints: 500, pointMultiplier: D(2) },
        ]),
      },
      loyaltyTransaction: { create: jest.fn(), findFirst: jest.fn() },
    } as never;
    const prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
    ingredients = {
      execute: jest.fn().mockResolvedValue({ alreadyApplied: false, deductions: [] }),
      restore: jest.fn().mockResolvedValue({ alreadyApplied: false, restored: [] }),
    };
    listener = new TransactionEventListener(
      { ofType: jest.fn() } as unknown as EventBusService,
      prisma as unknown as PrismaService,
      { invalidatePattern: jest.fn() } as unknown as RedisService,
      { get: jest.fn().mockReturnValue('test') } as unknown as ConfigService,
      ingredients as unknown as DeductIngredientsOnSaleUseCase,
    );
  });

  it('deducts ingredients atomically, credits points once and writes the marker', async () => {
    await listener.applyCreated('txn-1');

    expect(tx.$executeRaw).toHaveBeenCalled(); // advisory lock
    // Single ingredient implementation, inside the same DB transaction.
    expect(ingredients.execute).toHaveBeenCalledWith(
      {
        outletId: 'outlet-1',
        transactionId: 'txn-1',
        employeeId: 'emp-1',
        items: [{ productId: 'prod-1', variantId: null, quantity: 2 }],
      },
      tx,
    );
    // 55500 / 1000 * 2 (Gold) = 111
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ points: 111 }) }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'transaction_created' }) }),
    );
  });

  it('is a no-op on redelivery (marker already present)', async () => {
    tx.auditLog.count.mockResolvedValue(1);
    await listener.applyCreated('txn-1');
    expect(ingredients.execute).not.toHaveBeenCalled();
    expect(tx.customer.update).not.toHaveBeenCalled();
  });

  it('skips points and stats when the sale was already earned manually (POST /loyalty/earn)', async () => {
    tx.loyaltyTransaction.findFirst.mockResolvedValue({ id: 'lt-1' });
    await listener.applyCreated('txn-1');
    expect(tx.$queryRaw).toHaveBeenCalled(); // customer row lock
    expect(tx.customer.update).not.toHaveBeenCalled();
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ newValue: expect.objectContaining({ loyaltyPoints: 0 }) }),
      }),
    );
  });

  it('never touches a customer of another business', async () => {
    tx.customer.findFirst.mockResolvedValue(null);
    await listener.applyCreated('txn-1');
    expect(tx.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cust-1', businessId: 'biz-1' } }),
    );
    expect(tx.customer.update).not.toHaveBeenCalled();
  });

  it('awards no points for an unpaid credit sale but still counts the visit once', async () => {
    tx.transaction.findUnique.mockResolvedValue(sale({ status: 'credit' }));
    await listener.applyCreated('txn-1');
    expect(tx.customer.update).toHaveBeenCalledTimes(1);
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  it('does not downgrade a Gold customer on purchase', async () => {
    await listener.applyCreated('txn-1');
    const tierUpdates = tx.customer.update.mock.calls.filter(
      (c: Array<{ data: Record<string, unknown> }>) => 'loyaltyTier' in c[0].data,
    );
    expect(tierUpdates).toHaveLength(0);
  });

  it('void reverses the recorded ingredient usage, not the current recipe', async () => {
    tx.auditLog.count.mockImplementation(({ where }: { where: { action: string } }) =>
      Promise.resolve(where.action === 'transaction_created' ? 1 : 0),
    );
    tx.transaction.findUnique.mockResolvedValue({ ...sale(), voidedBy: 'sup-1' });
    tx.loyaltyTransaction.findFirst.mockResolvedValue({ points: 111 });
    tx.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      loyaltyPoints: 50,
      totalSpent: D(100000),
      visitCount: 3,
    });
    tx.customer.update.mockResolvedValue({ loyaltyPoints: 0, loyaltyTier: 'Gold' });

    await listener.applyVoided('txn-1', 'wrong order');

    expect(ingredients.restore).toHaveBeenCalledWith(
      { outletId: 'outlet-1', transactionId: 'txn-1', employeeId: 'sup-1', reason: 'wrong order' },
      tx,
    );
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'reversed', points: -50 }) }),
    );
    // points clamped to the current balance (50), never negative
    expect(tx.customer.update.mock.calls[0][0].data.loyaltyPoints).toEqual({ decrement: 50 });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'transaction_void_reversed' }),
      }),
    );
  });

  it('void redelivery is a no-op', async () => {
    tx.auditLog.count.mockResolvedValue(1);
    tx.transaction.findUnique.mockResolvedValue({ ...sale(), voidedBy: 'sup-1' });
    await listener.applyVoided('txn-1', 'x');
    expect(ingredients.restore).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe('loyalty points helpers', () => {
  it('uses amountPerPoint and guards non-positive values', () => {
    expect(computeLoyaltyPoints(50000, 1000, 1)).toBe(50);
    expect(computeLoyaltyPoints(50000, 0, 1)).toBe(0);
    expect(computeLoyaltyPoints(1999, 1000, 1.5)).toBe(2);
  });

  it('picks the highest reached tier', () => {
    const tiers = [
      { name: 'Silver', minPoints: 100 },
      { name: 'Gold', minPoints: 500 },
      { name: 'Regular', minPoints: 0 },
    ];
    expect(tierForPoints(tiers, 600)?.name).toBe('Gold');
    expect(tierForPoints(tiers, 150)?.name).toBe('Silver');
  });
});
