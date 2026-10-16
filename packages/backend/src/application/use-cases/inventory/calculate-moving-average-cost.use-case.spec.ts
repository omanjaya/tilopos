import { Prisma } from '@prisma/client';
import {
  CalculateMovingAverageCostUseCase,
  weightedAverageCost,
} from './calculate-moving-average-cost.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('weightedAverageCost (Decimal)', () => {
  it('computes the weighted average exactly, rounded to 4 dp', () => {
    // (10 * 1000 + 5 * 1300) / 15 = 1100
    expect(weightedAverageCost(10, 1000, 5, 1300).toString()).toBe('1100');
    // (3 * 0.1 + 3 * 0.2) / 6 = 0.15 — float math would give 0.15000000000000002
    expect(weightedAverageCost('3', '0.1', '3', '0.2').toString()).toBe('0.15');
    // 1/3 rounds half-up at 4 dp
    expect(weightedAverageCost(2, 0, 1, 1).toString()).toBe('1');
    expect(weightedAverageCost(2, 1, 1, 2).toString()).toBe('1.3333');
  });

  it('uses the incoming cost when there is no stock or no previous cost', () => {
    expect(weightedAverageCost(0, 5000, 10, 7000).toString()).toBe('7000');
    expect(weightedAverageCost(10, 0, 10, 7000).toString()).toBe('7000');
  });

  it('treats negative (oversold) stock as zero', () => {
    expect(weightedAverageCost(-4, 5000, 10, 7000).toString()).toBe('7000');
  });
});

describe('CalculateMovingAverageCostUseCase', () => {
  function makeTx(costPrice: string, totalStock: string | null) {
    return {
      $queryRaw: jest.fn().mockResolvedValue([]),
      product: {
        findUnique: jest.fn().mockResolvedValue({ costPrice: D(costPrice) }),
        update: jest.fn().mockResolvedValue({}),
      },
      productVariant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      stockLevel: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { quantity: totalStock === null ? null : D(totalStock) } }),
      },
      costPriceHistory: { create: jest.fn().mockResolvedValue({ id: 'hist-1' }) },
    };
  }

  it('locks the row, uses business-wide stock and writes through the tx client', async () => {
    const prisma = {} as PrismaService; // must not be used when tx is given
    const useCase = new CalculateMovingAverageCostUseCase(prisma);
    const tx = makeTx('1000', '30'); // 30 units across all outlets

    const result = await useCase.execute(
      {
        productId: 'p-1',
        outletId: 'o-1',
        existingQuantity: 999, // ignored: per-outlet figure
        newQuantity: 10,
        newUnitCost: 2000,
      },
      tx as unknown as Prisma.TransactionClient,
    );

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.stockLevel.aggregate).toHaveBeenCalledWith({
      where: { productId: 'p-1', variantId: null },
      _sum: { quantity: true },
    });
    // (30*1000 + 10*2000) / 40 = 1250
    expect(result).toEqual({ previousCost: 1000, newCost: 1250, costPriceHistoryId: 'hist-1' });
    const written = tx.product.update.mock.calls[0][0].data.costPrice as Prisma.Decimal;
    expect(written.toString()).toBe('1250');
    const history = tx.costPriceHistory.create.mock.calls[0][0].data;
    expect(history.quantityBefore.toString()).toBe('30');
  });

  it('requires a product or variant id', async () => {
    const useCase = new CalculateMovingAverageCostUseCase({} as PrismaService);
    await expect(
      useCase.execute({ outletId: 'o-1', newQuantity: 1, newUnitCost: 1 }),
    ).rejects.toThrow('productId or variantId');
  });
});
