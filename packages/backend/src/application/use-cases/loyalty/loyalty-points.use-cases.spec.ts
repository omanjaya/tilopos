import { Prisma } from '@prisma/client';
import { HttpStatus } from '@nestjs/common';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { EarnLoyaltyPointsUseCase } from './earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from './redeem-loyalty-points.use-case';
import { GetLoyaltyBalanceUseCase } from './get-loyalty-balance.use-case';
import { pickEligibleTier } from './loyalty-tier.util';

const BIZ = 'biz-a';
const CUSTOMER = 'cust-1';
const SALE = 'tx-1';
const D = (v: number) => new Prisma.Decimal(v);

function makePrisma() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    auditLog: { count: jest.fn().mockResolvedValue(0) },
    loyaltyTransaction: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    customer: {
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
  };
  const prisma = {
    customer: { findFirst: jest.fn() },
    transaction: { findFirst: jest.fn() },
    loyaltyProgram: { findFirst: jest.fn() },
    loyaltyTier: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

async function expectAppError(p: Promise<unknown>, code: ErrorCode, status?: HttpStatus) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
  if (status) expect((err as AppError).getStatus()).toBe(status);
}

describe('EarnLoyaltyPointsUseCase', () => {
  let db: ReturnType<typeof makePrisma>;
  let useCase: EarnLoyaltyPointsUseCase;

  beforeEach(() => {
    db = makePrisma();
    useCase = new EarnLoyaltyPointsUseCase(db.prisma as unknown as PrismaService);
    db.prisma.customer.findFirst.mockResolvedValue({
      id: CUSTOMER,
      loyaltyPoints: 10,
      loyaltyTier: 'regular',
    });
    db.prisma.transaction.findFirst.mockResolvedValue({
      id: SALE,
      customerId: CUSTOMER,
      status: 'completed',
      transactionType: 'sale',
      grandTotal: D(125_000),
    });
    db.prisma.loyaltyProgram.findFirst.mockResolvedValue({
      amountPerPoint: D(10_000),
      pointExpiryDays: null,
    });
    db.tx.customer.update.mockResolvedValue({
      loyaltyPoints: 22,
      totalSpent: D(125_000),
      loyaltyTier: 'regular',
    });
  });

  it('scopes the customer and the transaction to the caller business', async () => {
    await useCase.execute({ businessId: BIZ, customerId: CUSTOMER, transactionId: SALE });

    expect(db.prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CUSTOMER, businessId: BIZ, isActive: true } }),
    );
    expect(db.prisma.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SALE, outlet: { businessId: BIZ } } }),
    );
  });

  it('rejects a customer of another business', async () => {
    db.prisma.customer.findFirst.mockResolvedValue(null);

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: 'foreign', transactionId: SALE }),
      ErrorCode.CUSTOMER_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a transaction that is not in the business', async () => {
    db.prisma.transaction.findFirst.mockResolvedValue(null);

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: CUSTOMER, transactionId: 'foreign' }),
      ErrorCode.TRANSACTION_NOT_FOUND,
    );
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a transaction that belongs to another customer', async () => {
    db.prisma.transaction.findFirst.mockResolvedValue({
      id: SALE,
      customerId: 'someone-else',
      status: 'completed',
      transactionType: 'sale',
      grandTotal: D(125_000),
    });

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: CUSTOMER, transactionId: SALE }),
      ErrorCode.VALIDATION_ERROR,
    );
  });

  it('rejects voided / non-sale transactions', async () => {
    db.prisma.transaction.findFirst.mockResolvedValue({
      id: SALE,
      customerId: CUSTOMER,
      status: 'voided',
      transactionType: 'sale',
      grandTotal: D(125_000),
    });

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: CUSTOMER, transactionId: SALE }),
      ErrorCode.VALIDATION_ERROR,
    );
  });

  it('computes points from the DB grandTotal and increments atomically', async () => {
    const result = await useCase.execute({
      businessId: BIZ,
      customerId: CUSTOMER,
      transactionId: SALE,
    });

    // floor(125000 / 10000) = 12 points
    expect(result.pointsEarned).toBe(12);
    expect(db.tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CUSTOMER },
        data: expect.objectContaining({
          loyaltyPoints: { increment: 12 },
          totalSpent: { increment: D(125_000) },
          visitCount: { increment: 1 },
        }),
      }),
    );
    expect(db.tx.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'earned',
        points: 12,
        balanceAfter: 22,
        transactionId: SALE,
      }),
    });
  });

  it('adds only points when the sale listener already counted spend/visit', async () => {
    db.tx.auditLog.count.mockResolvedValue(1);
    await useCase.execute({ businessId: BIZ, customerId: CUSTOMER, transactionId: SALE });
    const data = db.tx.customer.update.mock.calls[0][0].data;
    expect(data).toEqual({ loyaltyPoints: { increment: 12 } });
  });

  it('refuses to earn twice for the same transaction', async () => {
    db.tx.loyaltyTransaction.findFirst.mockResolvedValue({ id: 'already' });

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: CUSTOMER, transactionId: SALE }),
      ErrorCode.CONFLICT,
      HttpStatus.CONFLICT,
    );
    expect(db.tx.customer.update).not.toHaveBeenCalled();
    expect(db.tx.$queryRaw).toHaveBeenCalled(); // row lock taken before the duplicate check
  });

  it('earns nothing when no program is active', async () => {
    db.prisma.loyaltyProgram.findFirst.mockResolvedValue(null);

    const result = await useCase.execute({
      businessId: BIZ,
      customerId: CUSTOMER,
      transactionId: SALE,
    });

    expect(result).toEqual({ pointsEarned: 0, totalPoints: 10, tierChanged: false });
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('RedeemLoyaltyPointsUseCase', () => {
  let db: ReturnType<typeof makePrisma>;
  let useCase: RedeemLoyaltyPointsUseCase;

  beforeEach(() => {
    db = makePrisma();
    useCase = new RedeemLoyaltyPointsUseCase(db.prisma as unknown as PrismaService);
    db.prisma.customer.findFirst.mockResolvedValue({ id: CUSTOMER });
    db.prisma.loyaltyProgram.findFirst.mockResolvedValue({ redemptionRate: D(100) });
    db.tx.customer.updateMany.mockResolvedValue({ count: 1 });
    db.tx.customer.findFirstOrThrow.mockResolvedValue({ loyaltyPoints: 50 });
  });

  it.each([0, -5, 1.5, Number.NaN])(
    'rejects invalid points %p before touching the DB',
    async (n) => {
      await expectAppError(
        useCase.execute({ businessId: BIZ, customerId: CUSTOMER, pointsToRedeem: n }),
        ErrorCode.VALIDATION_ERROR,
      );
      expect(db.prisma.customer.findFirst).not.toHaveBeenCalled();
    },
  );

  it('rejects a customer of another business', async () => {
    db.prisma.customer.findFirst.mockResolvedValue(null);

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: 'foreign', pointsToRedeem: 10 }),
      ErrorCode.CUSTOMER_NOT_FOUND,
    );
    expect(db.prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign', businessId: BIZ, isActive: true } }),
    );
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('decrements with a conditional update and records a negative ledger row', async () => {
    const result = await useCase.execute({
      businessId: BIZ,
      customerId: CUSTOMER,
      pointsToRedeem: 30,
    });

    expect(db.tx.customer.updateMany).toHaveBeenCalledWith({
      where: { id: CUSTOMER, businessId: BIZ, loyaltyPoints: { gte: 30 } },
      data: { loyaltyPoints: { decrement: 30 } },
    });
    expect(db.tx.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'redeemed', points: -30, balanceAfter: 50 }),
    });
    // 30 points x Rp100 redemption value
    expect(result).toEqual({ discountAmount: 3000, pointsRedeemed: 30, remainingPoints: 50 });
  });

  it('fails when the balance is insufficient (concurrent redeem lost the race)', async () => {
    db.tx.customer.updateMany.mockResolvedValue({ count: 0 });

    await expectAppError(
      useCase.execute({ businessId: BIZ, customerId: CUSTOMER, pointsToRedeem: 30 }),
      ErrorCode.INSUFFICIENT_POINTS,
    );
    expect(db.tx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });
});

describe('GetLoyaltyBalanceUseCase', () => {
  it('finds the next tier by points for customers on the default tier', async () => {
    const db = makePrisma();
    db.prisma.customer.findFirst.mockResolvedValue({
      id: CUSTOMER,
      loyaltyPoints: 40,
      loyaltyTier: 'regular',
      totalSpent: D(0),
      visitCount: 1,
    });
    db.prisma.loyaltyProgram.findFirst.mockResolvedValue({ id: 'p' });
    db.prisma.loyaltyTier.findFirst.mockResolvedValue({ name: 'Silver', minPoints: 100 });

    const useCase = new GetLoyaltyBalanceUseCase(db.prisma as unknown as PrismaService);
    const result = await useCase.execute({ businessId: BIZ, customerId: CUSTOMER });

    expect(result.nextTier).toEqual({ name: 'Silver', minPoints: 100, pointsNeeded: 60 });
    expect(db.prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CUSTOMER, businessId: BIZ } }),
    );
  });
});

describe('pickEligibleTier', () => {
  const tiers = [
    { name: 'Silver', minPoints: 100, minSpent: D(0), sortOrder: 1 },
    { name: 'Gold', minPoints: 500, minSpent: D(1_000_000), sortOrder: 2 },
  ];

  it('returns the highest tier whose thresholds are met', () => {
    expect(pickEligibleTier(tiers, 600, D(2_000_000))?.name).toBe('Gold');
    expect(pickEligibleTier(tiers, 600, D(10))?.name).toBe('Silver');
    expect(pickEligibleTier(tiers, 10, D(10))).toBeNull();
  });
});
