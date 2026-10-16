import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { DistributedLockService } from '../../shared/locks/distributed-lock.service';
import { LoyaltyCronService } from './loyalty-cron.service';

const BIZ = 'biz-a';

function setup(opts: { credits: number; debits: number; balance: number }) {
  const lot = { id: 'lot-1', customerId: 'c1', points: 100, createdAt: new Date('2026-01-01') };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    loyaltyTransaction: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      aggregate: jest
        .fn()
        .mockResolvedValueOnce({ _sum: { points: opts.credits } })
        .mockResolvedValueOnce({ _sum: { points: -opts.debits } })
        .mockResolvedValueOnce({ _sum: { points: null } }),
      create: jest.fn().mockResolvedValue({}),
    },
    customer: {
      findFirstOrThrow: jest.fn().mockResolvedValue({ loyaltyPoints: opts.balance }),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ loyaltyPoints: opts.balance - data.loyaltyPoints.decrement }),
        ),
    },
  };
  const prisma = {
    loyaltyTransaction: { findMany: jest.fn().mockResolvedValueOnce([lot]) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const lock = {
    runExclusive: jest.fn((_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
  };
  const service = new LoyaltyCronService(
    prisma as unknown as PrismaService,
    lock as unknown as DistributedLockService,
  );
  return { service, tx, prisma, lock };
}

describe('LoyaltyCronService.expirePointsForBusiness', () => {
  it('expires only the unspent part of the lot (points already redeemed are not deducted again)', async () => {
    // Earned 100 in the expiring lot, 70 were redeemed since; balance 30.
    const { service, tx } = setup({ credits: 100, debits: 70, balance: 30 });

    const result = await service.expirePointsForBusiness(BIZ);

    expect(result.totalPointsExpired).toBe(30);
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { loyaltyPoints: { decrement: 30 } } }),
    );
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'expired', points: -30, balanceAfter: 0 }),
    });
  });

  it('expires nothing when the lot was fully spent, and never touches the tier', async () => {
    const { service, tx } = setup({ credits: 100, debits: 100, balance: 50 });

    const result = await service.expirePointsForBusiness(BIZ);

    expect(result.totalPointsExpired).toBe(0);
    expect(tx.customer.update).not.toHaveBeenCalled();
    // lots are still claimed so they are not re-processed
    expect(tx.loyaltyTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['lot-1'] }, customerId: 'c1', expiresAt: { not: null } },
      data: { expiresAt: null },
    });
  });

  it('runs the cron under the distributed lock', async () => {
    const { service, lock, prisma } = setup({ credits: 0, debits: 0, balance: 0 });
    (prisma as unknown as { loyaltyProgram: unknown }).loyaltyProgram = {
      findMany: jest.fn().mockResolvedValue([]),
    };

    await service.handlePointsExpiry();

    expect(lock.runExclusive).toHaveBeenCalledWith(
      'loyalty:points-expiry',
      expect.any(Number),
      expect.any(Function),
    );
  });
});

describe('LoyaltyCronService.evaluateTiersForBusiness', () => {
  it('updates only the tier, conditionally on the tier that was read', async () => {
    const tx = {
      customer: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      loyaltyTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      loyaltyTier: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { name: 'Silver', minPoints: 100, minSpent: new Prisma.Decimal(0), sortOrder: 1 },
          ]),
      },
      customer: {
        findMany: jest.fn().mockResolvedValueOnce([
          {
            id: 'c1',
            name: 'A',
            loyaltyPoints: 150,
            loyaltyTier: 'regular',
            totalSpent: new Prisma.Decimal(0),
          },
        ]),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const service = new LoyaltyCronService(
      prisma as unknown as PrismaService,
      {} as DistributedLockService,
    );

    const result = await service.evaluateTiersForBusiness(BIZ);

    expect(result.upgraded).toBe(1);
    expect(tx.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', businessId: BIZ, loyaltyTier: 'regular' },
      data: { loyaltyTier: 'Silver' },
    });
  });
});
