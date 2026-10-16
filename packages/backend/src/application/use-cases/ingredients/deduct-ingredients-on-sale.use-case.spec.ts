import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DeductIngredientsOnSaleUseCase,
  DeductIngredientsInput,
  SALE_REFERENCE_TYPE,
  VOID_REFERENCE_TYPE,
} from './deduct-ingredients-on-sale.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

const D = (v: number | string) => new Prisma.Decimal(v);

describe('DeductIngredientsOnSaleUseCase', () => {
  let useCase: DeductIngredientsOnSaleUseCase;
  let tx: {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    outlet: { findUnique: jest.Mock };
    recipe: { findMany: jest.Mock };
    ingredientStockLevel: { updateMany: jest.Mock; findMany: jest.Mock };
    ingredientStockMovement: { findFirst: jest.Mock; createMany: jest.Mock; groupBy: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };

  const baseRecipe = {
    productId: 'prod-1',
    variantId: null,
    items: [
      { ingredientId: 'ing-rice', quantity: D('0.2') },
      { ingredientId: 'ing-oil', quantity: D('0.05') },
    ],
  };

  const input: DeductIngredientsInput = {
    outletId: 'outlet-1',
    transactionId: 'txn-1',
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      outlet: { findUnique: jest.fn().mockResolvedValue({ businessId: 'biz-1' }) },
      recipe: { findMany: jest.fn().mockResolvedValue([baseRecipe]) },
      ingredientStockLevel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          {
            ingredientId: 'ing-rice',
            quantity: D(9.6),
            lowStockAlert: D(1),
            ingredient: { name: 'Rice' },
          },
          {
            ingredientId: 'ing-oil',
            quantity: D(0.5),
            lowStockAlert: D(1),
            ingredient: { name: 'Oil' },
          },
        ]),
      },
      ingredientStockMovement: {
        findFirst: jest.fn().mockResolvedValue(null),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)) };
    useCase = new DeductIngredientsOnSaleUseCase(prisma as unknown as PrismaService);
  });

  it('batches the recipe lookup, scopes it to the outlet business and deducts with guarded decrements', async () => {
    const result = await useCase.execute({
      ...input,
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-1', quantity: 1 },
      ],
    });

    expect(tx.recipe.findMany).toHaveBeenCalledTimes(1);
    expect(tx.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: { in: ['prod-1'] }, product: { businessId: 'biz-1' } },
      }),
    );
    // Aggregated per ingredient: 0.2 * 3 = 0.6 rice, one guarded update each.
    expect(tx.ingredientStockLevel.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.ingredientStockLevel.updateMany).toHaveBeenCalledWith({
      where: { outletId: 'outlet-1', ingredientId: 'ing-rice', quantity: { gte: D('0.6') } },
      data: { quantity: { decrement: D('0.6') } },
    });
    expect(tx.ingredientStockMovement.createMany).toHaveBeenCalledTimes(1);
    const rows = tx.ingredientStockMovement.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      movementType: 'usage',
      referenceId: 'txn-1',
      referenceType: SALE_REFERENCE_TYPE,
    });
    expect(result.alreadyApplied).toBe(false);
    expect(result.deductions.find((d) => d.ingredientId === 'ing-oil')).toMatchObject({
      quantityDeducted: 0.15,
      insufficientStock: false,
      isBelowAlert: true,
    });
  });

  it('is idempotent: a sale that already has usage movements is not deducted again', async () => {
    tx.ingredientStockMovement.findFirst.mockResolvedValue({ id: 'mv-1' });

    const result = await useCase.execute(input);

    expect(result).toEqual({ alreadyApplied: true, deductions: [] });
    expect(tx.$executeRaw).toHaveBeenCalled(); // advisory lock taken before the check
    expect(tx.ingredientStockLevel.updateMany).not.toHaveBeenCalled();
    expect(tx.ingredientStockMovement.createMany).not.toHaveBeenCalled();
  });

  it('prefers the exact-variant recipe and falls back to the base recipe', async () => {
    tx.recipe.findMany.mockResolvedValue([
      baseRecipe,
      {
        productId: 'prod-1',
        variantId: 'var-L',
        items: [{ ingredientId: 'ing-rice', quantity: D(1) }],
      },
    ]);

    await useCase.execute({
      ...input,
      items: [
        { productId: 'prod-1', variantId: 'var-L', quantity: 1 },
        { productId: 'prod-1', variantId: 'var-S', quantity: 1 },
      ],
    });

    // var-L uses its own recipe (1 rice); var-S falls back to base (0.2 rice + 0.05 oil).
    expect(tx.ingredientStockLevel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ingredientId: 'ing-rice', quantity: { gte: D('1.2') } }),
      }),
    );
  });

  it('never goes negative: takes what is left of a short ingredient and flags it', async () => {
    tx.ingredientStockLevel.updateMany.mockImplementation(async (args) =>
      args.where.ingredientId === 'ing-oil' && args.where.quantity?.gte?.equals?.(D('0.1'))
        ? { count: 0 }
        : { count: 1 },
    );
    tx.$queryRaw.mockResolvedValue([{ id: 'sl-oil', quantity: D('0.04') }]);

    const result = await useCase.execute(input);

    expect(tx.ingredientStockLevel.updateMany).toHaveBeenCalledWith({
      where: { id: 'sl-oil', quantity: { gte: D('0.04') } },
      data: { quantity: { decrement: D('0.04') } },
    });
    const oil = result.deductions.find((d) => d.ingredientId === 'ing-oil');
    expect(oil).toMatchObject({ quantityDeducted: 0.04, insufficientStock: true });
    const rows = tx.ingredientStockMovement.createMany.mock.calls[0][0].data;
    expect(
      rows.find((r: { ingredientId: string }) => r.ingredientId === 'ing-oil').notes,
    ).toContain('Insufficient stock');
  });

  it('uses the caller transaction when one is passed', async () => {
    await useCase.execute(input, tx as unknown as Prisma.TransactionClient);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.ingredientStockMovement.createMany).toHaveBeenCalled();
  });

  it('rejects an unknown outlet', async () => {
    tx.outlet.findUnique.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  describe('restore', () => {
    it('reverses recorded usage once', async () => {
      tx.ingredientStockMovement.groupBy.mockResolvedValue([
        { ingredientId: 'ing-rice', _sum: { quantity: D('-0.4') } },
      ]);

      const result = await useCase.restore({ outletId: 'outlet-1', transactionId: 'txn-1' });

      expect(tx.ingredientStockLevel.updateMany).toHaveBeenCalledWith({
        where: { outletId: 'outlet-1', ingredientId: 'ing-rice' },
        data: { quantity: { increment: D('0.4') } },
      });
      expect(tx.ingredientStockMovement.createMany.mock.calls[0][0].data[0]).toMatchObject({
        referenceType: VOID_REFERENCE_TYPE,
        quantity: D('0.4'),
      });
      expect(result.restored).toEqual([{ ingredientId: 'ing-rice', quantityRestored: 0.4 }]);
    });

    it('is idempotent', async () => {
      tx.ingredientStockMovement.findFirst.mockResolvedValue({ id: 'void-mv' });

      const result = await useCase.restore({ outletId: 'outlet-1', transactionId: 'txn-1' });

      expect(result).toEqual({ alreadyApplied: true, restored: [] });
      expect(tx.ingredientStockLevel.updateMany).not.toHaveBeenCalled();
    });
  });
});
