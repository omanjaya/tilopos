import { Prisma } from '@prisma/client';
import { IngredientsService } from './ingredients.service';
import type { PrismaService } from '../../infrastructure/database/prisma.service';

describe('IngredientsService', () => {
  let tx: {
    $executeRaw: jest.Mock;
    ingredient: { findMany: jest.Mock; createMany: jest.Mock; updateMany: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    ingredient: { findMany: jest.Mock };
    recipe: { findFirst: jest.Mock };
  };
  let service: IngredientsService;

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      ingredient: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
      ingredient: { findMany: jest.fn() },
      recipe: { findFirst: jest.fn() },
    };
    service = new IngredientsService(prisma as unknown as PrismaService);
  });

  describe('importIngredients', () => {
    it('looks existing names up once, creates new rows in one statement and updates matches', async () => {
      tx.ingredient.findMany
        .mockResolvedValueOnce([{ id: 'ing-1', name: 'Gula', sku: null }]) // by name
        .mockResolvedValueOnce([]); // by sku

      const result = await service.importIngredients('biz-1', [
        { name: 'gula', unit: 'kg', costPerUnit: 12000 },
        { name: 'Garam', unit: 'kg', sku: 'GRM' },
        { name: 'GARAM', unit: 'kg' },
        { name: '', unit: 'kg' },
      ]);

      expect(tx.ingredient.findMany).toHaveBeenCalledTimes(2);
      expect(tx.ingredient.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ businessId: 'biz-1', name: 'Garam', sku: 'GRM' })],
      });
      expect(tx.ingredient.updateMany).toHaveBeenCalledWith({
        where: { id: 'ing-1', businessId: 'biz-1' },
        data: expect.objectContaining({ unit: 'kg', isActive: true }),
      });
      expect(result).toMatchObject({ total: 4, created: 1, updated: 1, skipped: 1 });
      expect(result.errors).toHaveLength(1);
    });

    it('reports a SKU used by another ingredient instead of failing the transaction', async () => {
      tx.ingredient.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'other', sku: 'DUP' }]);

      const result = await service.importIngredients('biz-1', [
        { name: 'Tepung', unit: 'kg', sku: 'DUP' },
      ]);

      expect(tx.ingredient.createMany).not.toHaveBeenCalled();
      expect(result.errors[0].error).toContain('SKU "DUP"');
    });
  });

  describe('ingredientsToCsv', () => {
    it('quotes values and neutralises formula injection', () => {
      const csv = service.ingredientsToCsv([
        {
          id: 'i',
          name: '=HYPERLINK("http://x")',
          sku: '+1,2',
          unit: '@kg',
          costPerUnit: 1,
          isActive: true,
          createdAt: new Date('2026-09-27T00:00:00.000Z'),
        },
      ]);
      const line = csv.split('\n')[1];
      expect(line.startsWith(`"'=HYPERLINK(""http://x"")"`)).toBe(true);
      expect(line).toContain(`"'+1,2"`);
      expect(line).toContain(`'@kg`);
    });
  });

  describe('getRecipeCostHistory', () => {
    it('is scoped to the business and does not fabricate history', async () => {
      prisma.recipe.findFirst.mockResolvedValue({
        id: 'rec-1',
        productId: 'prod-1',
        items: [
          {
            ingredientId: 'ing-1',
            quantity: new Prisma.Decimal('0.25'),
            unit: 'kg',
            ingredient: { name: 'Gula', costPerUnit: new Prisma.Decimal('12000.5') },
          },
        ],
      });

      const result = await service.getRecipeCostHistory('rec-1', 'biz-1');

      expect(prisma.recipe.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rec-1', product: { businessId: 'biz-1' } } }),
      );
      expect(result.currentCost.totalCost).toBe(3000.13);
      expect(result.history).toEqual([]);
      expect(result.historyAvailable).toBe(false);
    });
  });
});
