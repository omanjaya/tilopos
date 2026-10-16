import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaIngredientRepository } from './prisma-ingredient.repository';
import type { PrismaService } from '../database/prisma.service';

const D = (v: number) => new Prisma.Decimal(v);

describe('PrismaIngredientRepository', () => {
  let tx: {
    ingredient: { count: jest.Mock };
    outlet: { count: jest.Mock };
    ingredientStockLevel: {
      upsert: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    ingredientStockMovement: { create: jest.Mock };
  };
  let prisma: Record<string, unknown> & { $transaction: jest.Mock };
  let repo: PrismaIngredientRepository;

  const params = {
    businessId: 'biz-1',
    outletId: 'outlet-1',
    ingredientId: 'ing-1',
    quantity: -5,
  };

  beforeEach(() => {
    tx = {
      ingredient: { count: jest.fn().mockResolvedValue(1) },
      outlet: { count: jest.fn().mockResolvedValue(1) },
      ingredientStockLevel: {
        upsert: jest.fn().mockResolvedValue({ id: 'sl-1', quantity: D(15) }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'sl-1', quantity: D(5) }),
      },
      ingredientStockMovement: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      ...tx,
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
      recipe: { findFirst: jest.fn(), deleteMany: jest.fn() },
    };
    repo = new PrismaIngredientRepository(prisma as unknown as PrismaService);
  });

  describe('applyStockAdjustment', () => {
    it('decrements with a quantity >= n guard and records a signed adjustment movement', async () => {
      const result = await repo.applyStockAdjustment(params);

      expect(tx.ingredientStockLevel.updateMany).toHaveBeenCalledWith({
        where: { outletId: 'outlet-1', ingredientId: 'ing-1', quantity: { gte: D(5) } },
        data: { quantity: { decrement: D(5) } },
      });
      expect(tx.ingredientStockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ movementType: 'adjustment', quantity: D(-5) }),
      });
      expect(result).toEqual({ stockLevelId: 'sl-1', previousQuantity: 10, newQuantity: 5 });
    });

    it('rejects an insufficient decrement and writes no movement', async () => {
      tx.ingredientStockLevel.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.applyStockAdjustment(params)).rejects.toThrow(BadRequestException);
      expect(tx.ingredientStockMovement.create).not.toHaveBeenCalled();
    });

    it('increments atomically with upsert (no absolute write) and records adjustment, not purchase', async () => {
      await repo.applyStockAdjustment({ ...params, quantity: 5 });

      expect(tx.ingredientStockLevel.upsert).toHaveBeenCalledWith({
        where: { outletId_ingredientId: { outletId: 'outlet-1', ingredientId: 'ing-1' } },
        create: { outletId: 'outlet-1', ingredientId: 'ing-1', quantity: D(5) },
        update: { quantity: { increment: D(5) } },
      });
      expect(tx.ingredientStockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ movementType: 'adjustment' }),
      });
    });

    it('rejects an ingredient of another business before touching stock', async () => {
      tx.ingredient.count.mockResolvedValue(0);

      await expect(repo.applyStockAdjustment(params)).rejects.toThrow(NotFoundException);
      expect(tx.ingredient.count).toHaveBeenCalledWith({
        where: { id: 'ing-1', businessId: 'biz-1' },
      });
      expect(tx.ingredientStockLevel.updateMany).not.toHaveBeenCalled();
      expect(tx.ingredientStockLevel.upsert).not.toHaveBeenCalled();
    });
  });

  describe('tenant scoping', () => {
    it('scopes recipe lookups and deletes through product.businessId', async () => {
      (prisma.recipe as { deleteMany: jest.Mock }).deleteMany.mockResolvedValue({ count: 0 });

      await expect(repo.deleteRecipe('rec-foreign', 'biz-1')).rejects.toThrow(NotFoundException);
      expect((prisma.recipe as { deleteMany: jest.Mock }).deleteMany).toHaveBeenCalledWith({
        where: { id: 'rec-foreign', product: { businessId: 'biz-1' } },
      });
    });

    it('refuses unscoped calls at runtime too', async () => {
      await expect(repo.findById('ing-1', '')).rejects.toThrow('businessId is required');
    });
  });
});
