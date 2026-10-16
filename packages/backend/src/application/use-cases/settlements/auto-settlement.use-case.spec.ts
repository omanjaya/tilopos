import { Prisma } from '@prisma/client';
import {
  AutoSettlementUseCase,
  computeSettlementTotals,
  settlementDateOf,
} from './auto-settlement.use-case';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('computeSettlementTotals', () => {
  it('uses per-payment amounts for split payments, deducts cash change and refunds', () => {
    const totals = computeSettlementTotals(
      [
        // 100,000 sale paid 70,000 QRIS + 50,000 cash => 20,000 change in cash
        {
          id: 'tx-1',
          grandTotal: 100000,
          payments: [
            { paymentMethod: 'qris', amount: 70000 },
            { paymentMethod: 'cash', amount: 50000 },
          ],
        },
        // plain cash sale
        { id: 'tx-2', grandTotal: 25000, payments: [{ paymentMethod: 'cash', amount: 25000 }] },
      ],
      // refund of 10,000 paid back in cash
      [{ id: 'rf-1', payments: [{ paymentMethod: 'cash', amount: 10000 }] }],
    );

    const cash = totals.find((t) => t.paymentMethod === 'cash')!;
    const qris = totals.find((t) => t.paymentMethod === 'qris')!;

    expect(qris.grossAmount.toNumber()).toBe(70000);
    expect(qris.totalTransactions).toBe(1);
    // 50,000 - 20,000 change + 25,000 - 10,000 refund
    expect(cash.grossAmount.toNumber()).toBe(45000);
    expect(cash.refundAmount.toNumber()).toBe(10000);
    expect(cash.totalTransactions).toBe(3);
    expect(cash.feeAmount.toNumber()).toBe(0);
    // gross of both methods equals net money taken (125,000 sales - 10,000 refund)
    expect(cash.grossAmount.plus(qris.grossAmount).toNumber()).toBe(115000);
  });

  it('keys fees by PaymentMethod enum values', () => {
    const [qris] = computeSettlementTotals(
      [{ id: 't', grandTotal: 100000, payments: [{ paymentMethod: 'qris', amount: 100000 }] }],
      [],
    );
    expect(qris.feeAmount.toNumber()).toBe(700); // 0.7%
    expect(qris.netAmount.toNumber()).toBe(99300);
  });

  it('adds credit repayments per method', () => {
    const [cash] = computeSettlementTotals([], [], [{ paymentMethod: 'cash', amount: 30000 }]);
    expect(cash.grossAmount.toNumber()).toBe(30000);
  });
});

describe('settlementDateOf', () => {
  it('maps a WIB business day to its calendar date (not the UTC day)', () => {
    // 2026-09-26 23:30 WIB = 2026-09-26T16:30Z; 2026-09-27 00:30 WIB = 2026-09-26T17:30Z
    expect(settlementDateOf(new Date('2026-09-26T16:30:00Z')).toISOString()).toBe(
      '2026-09-26T00:00:00.000Z',
    );
    expect(settlementDateOf(new Date('2026-09-26T17:30:00Z')).toISOString()).toBe(
      '2026-09-27T00:00:00.000Z',
    );
  });
});

describe('AutoSettlementUseCase', () => {
  function setup(existing: { id: string } | null) {
    const prisma = {
      transaction: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'tx-1',
              grandTotal: new Prisma.Decimal(50000),
              payments: [{ paymentMethod: 'cash', amount: new Prisma.Decimal(50000) }],
            },
          ])
          .mockResolvedValueOnce([]),
      },
      creditPayment: { findMany: jest.fn().mockResolvedValue([]) },
      paymentSettlement: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue({ id: 'new-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: existing?.id ?? 'new-1' }),
      },
    };
    return { prisma, useCase: new AutoSettlementUseCase(prisma as unknown as PrismaService) };
  }

  it('creates a settlement per method scoped to the outlet business', async () => {
    const { prisma, useCase } = setup(null);
    const res = await useCase.execute({
      outletId: 'o-1',
      businessId: 'b-1',
      settlementDate: new Date('2026-09-26T05:00:00Z'),
    });
    expect(res).toEqual([{ settlementId: 'new-1', paymentMethod: 'cash', updated: true }]);
    expect(prisma.transaction.findMany.mock.calls[0][0].where).toMatchObject({
      outletId: 'o-1',
      outlet: { businessId: 'b-1' },
    });
    expect(prisma.paymentSettlement.create).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a re-run only updates the existing row while pending', async () => {
    const { prisma, useCase } = setup({ id: 'existing-1' });
    const res = await useCase.execute({
      outletId: 'o-1',
      businessId: 'b-1',
      settlementDate: new Date('2026-09-26T05:00:00Z'),
    });
    expect(prisma.paymentSettlement.create).not.toHaveBeenCalled();
    expect(prisma.paymentSettlement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          outletId: 'o-1',
          paymentMethod: 'cash',
          status: 'pending',
        }),
      }),
    );
    expect(res[0].settlementId).toBe('existing-1');
  });

  it('falls back to the conditional update when a concurrent run wins the create (P2002)', async () => {
    const { prisma, useCase } = setup(null);
    prisma.paymentSettlement.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    prisma.paymentSettlement.updateMany.mockResolvedValue({ count: 0 });
    const res = await useCase.execute({ outletId: 'o-1', businessId: 'b-1' });
    expect(res[0].updated).toBe(false);
  });
});
