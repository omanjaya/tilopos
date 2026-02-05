import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IngredientsService } from '../../src/modules/ingredients/ingredients.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('IngredientsService - Import/Export', () => {
  let service: IngredientsService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
    valueOf: () => value,
    toString: () => String(value),
    [Symbol.toPrimitive]: () => value,
  });

  beforeEach(() => {
    mockPrisma = {
      ingredient: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ingredientStockLevel: {
        findMany: jest.fn(),
      },
      ingredientStockMovement: {
        findMany: jest.fn(),
      },
      recipe: {
        findUnique: jest.fn(),
      },
      outlet: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new IngredientsService(mockPrisma);
  });

  // ==========================================================================
  // CSV Import - creates new ingredients
  // ==========================================================================

  describe('importIngredients (CSV format)', () => {
    it('should parse and import ingredients from CSV string', async () => {
      // Arrange
      const csv = `name,unit,costPerUnit,sku
Sugar,kg,15000,ING-001
Flour,kg,12000,ING-002`;

      (mockPrisma.ingredient.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 'new-1' });

      // Act
      const result = await service.importIngredients('biz-1', csv, 'csv');

      // Assert
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.ingredient.create).toHaveBeenCalledTimes(2);
    });

    it('should update existing ingredients from CSV import', async () => {
      // Arrange
      const csv = `name,unit,costPerUnit
Sugar,kg,18000`;

      (mockPrisma.ingredient.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-1',
        name: 'Sugar',
      });
      (mockPrisma.ingredient.update as jest.Mock).mockResolvedValue({ id: 'existing-1' });

      // Act
      const result = await service.importIngredients('biz-1', csv, 'csv');

      // Assert
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(mockPrisma.ingredient.update).toHaveBeenCalledTimes(1);
    });

    it('should return empty result for CSV with only headers', async () => {
      // Arrange
      const csv = 'name,unit,costPerUnit,sku';

      // Act
      const result = await service.importIngredients('biz-1', csv, 'csv');

      // Assert
      expect(result.total).toBe(0);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // JSON Import - creates new ingredients
  // ==========================================================================

  describe('importIngredients (JSON format)', () => {
    it('should import ingredients from JSON array', async () => {
      // Arrange
      const items = [
        { name: 'Salt', unit: 'kg', costPerUnit: 5000 },
        { name: 'Pepper', unit: 'g', costPerUnit: 2000 },
      ];

      (mockPrisma.ingredient.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 'new-1' });

      // Act
      const result = await service.importIngredients('biz-1', items, 'json');

      // Assert
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed create and update in JSON import', async () => {
      // Arrange
      const items = [
        { name: 'Salt', unit: 'kg', costPerUnit: 5000 },
        { name: 'Existing Butter', unit: 'kg', costPerUnit: 30000 },
      ];

      (mockPrisma.ingredient.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-butter', name: 'Existing Butter' });

      (mockPrisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 'new-1' });
      (mockPrisma.ingredient.update as jest.Mock).mockResolvedValue({ id: 'existing-butter' });

      // Act
      const result = await service.importIngredients('biz-1', items, 'json');

      // Assert
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
    });
  });

  // ==========================================================================
  // Duplicate detection
  // ==========================================================================

  describe('duplicate detection', () => {
    it('should skip duplicates within the same import batch', async () => {
      // Arrange
      const items = [
        { name: 'Sugar', unit: 'kg', costPerUnit: 15000 },
        { name: 'Sugar', unit: 'g', costPerUnit: 15 },
      ];

      (mockPrisma.ingredient.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 'new-1' });

      // Act
      const result = await service.importIngredients('biz-1', items, 'json');

      // Assert
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should detect case-insensitive duplicates within batch', async () => {
      // Arrange
      const items = [
        { name: 'sugar', unit: 'kg' },
        { name: 'Sugar', unit: 'kg' },
        { name: 'SUGAR', unit: 'kg' },
      ];

      (mockPrisma.ingredient.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 'new-1' });

      // Act
      const result = await service.importIngredients('biz-1', items, 'json');

      // Assert
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(2);
    });
  });

  // ==========================================================================
  // Validation errors
  // ==========================================================================

  describe('validation errors', () => {
    it('should report errors for items missing name', async () => {
      // Arrange
      const items = [{ name: '', unit: 'kg', costPerUnit: 5000 }];

      // Act
      const result = await service.importIngredients('biz-1', items, 'json');

      // Assert
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Missing required fields');
    });

    it('should report errors for items missing unit', async () => {
      // Arrange
      const items = [{ name: 'Sugar', unit: '' }];

      // Act
      const result = await service.importIngredients('biz-1', items, 'json');

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Missing required fields');
    });
  });

  // ==========================================================================
  // Export to CSV format
  // ==========================================================================

  describe('exportIngredients (CSV)', () => {
    it('should export ingredients as CSV string', async () => {
      // Arrange
      const ingredients = [
        {
          id: 'ing-1',
          name: 'Sugar',
          sku: 'ING-001',
          unit: 'kg',
          costPerUnit: makeDecimal(15000),
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          businessId: 'biz-1',
          imageUrl: null,
          updatedAt: new Date(),
        },
        {
          id: 'ing-2',
          name: 'Flour',
          sku: null,
          unit: 'kg',
          costPerUnit: makeDecimal(12000),
          isActive: true,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          businessId: 'biz-1',
          imageUrl: null,
          updatedAt: new Date(),
        },
      ];
      (mockPrisma.ingredient.findMany as jest.Mock).mockResolvedValue(ingredients);

      // Act
      const result = await service.exportIngredients('biz-1', 'csv');

      // Assert
      expect(typeof result).toBe('string');
      const csvResult = result as string;
      expect(csvResult).toContain('name,sku,unit,costPerUnit,isActive,createdAt');
      expect(csvResult).toContain('Sugar');
      expect(csvResult).toContain('Flour');
      expect(csvResult).toContain('ING-001');
      const lines = csvResult.split('\n');
      expect(lines).toHaveLength(3); // header + 2 rows
    });
  });

  // ==========================================================================
  // Export to JSON format
  // ==========================================================================

  describe('exportIngredients (JSON)', () => {
    it('should export ingredients as JSON array', async () => {
      // Arrange
      const ingredients = [
        {
          id: 'ing-1',
          name: 'Sugar',
          sku: 'ING-001',
          unit: 'kg',
          costPerUnit: makeDecimal(15000),
          isActive: true,
          createdAt: new Date('2026-01-01'),
          businessId: 'biz-1',
          imageUrl: null,
          updatedAt: new Date(),
        },
      ];
      (mockPrisma.ingredient.findMany as jest.Mock).mockResolvedValue(ingredients);

      // Act
      const result = await service.exportIngredients('biz-1', 'json');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      const jsonResult = result as { name: string; costPerUnit: number }[];
      expect(jsonResult).toHaveLength(1);
      expect(jsonResult[0].name).toBe('Sugar');
      expect(jsonResult[0].costPerUnit).toBe(15000);
    });

    it('should return empty array when no ingredients exist', async () => {
      // Arrange
      (mockPrisma.ingredient.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.exportIngredients('biz-1', 'json');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Recipe cost history
  // ==========================================================================

  describe('getRecipeCostHistory', () => {
    it('should calculate current recipe cost correctly', async () => {
      // Arrange
      const recipe = {
        id: 'recipe-1',
        productId: 'prod-1',
        variantId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            ingredientId: 'ing-1',
            quantity: makeDecimal(0.5),
            unit: 'kg',
            ingredient: {
              id: 'ing-1',
              name: 'Sugar',
              costPerUnit: makeDecimal(15000),
              unit: 'kg',
              businessId: 'biz-1',
              sku: null,
              imageUrl: null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            id: 'ri-1',
            recipeId: 'recipe-1',
            createdAt: new Date(),
          },
          {
            ingredientId: 'ing-2',
            quantity: makeDecimal(0.2),
            unit: 'kg',
            ingredient: {
              id: 'ing-2',
              name: 'Flour',
              costPerUnit: makeDecimal(12000),
              unit: 'kg',
              businessId: 'biz-1',
              sku: null,
              imageUrl: null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            id: 'ri-2',
            recipeId: 'recipe-1',
            createdAt: new Date(),
          },
        ],
      };

      (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(recipe);
      (mockPrisma.ingredientStockMovement.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getRecipeCostHistory('recipe-1');

      // Assert
      // Sugar: 0.5 * 15000 = 7500
      // Flour: 0.2 * 12000 = 2400
      // Total: 9900
      expect(result.currentCost.totalCost).toBe(9900);
      expect(result.currentCost.items).toHaveLength(2);
      expect(result.currentCost.items[0].ingredientName).toBe('Sugar');
      expect(result.currentCost.items[0].itemCost).toBe(7500);
      expect(result.currentCost.items[1].ingredientName).toBe('Flour');
      expect(result.currentCost.items[1].itemCost).toBe(2400);
    });

    it('should throw NotFoundException for non-existent recipe', async () => {
      // Arrange
      (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getRecipeCostHistory('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include historical snapshots from purchase movements', async () => {
      // Arrange
      const recipe = {
        id: 'recipe-1',
        productId: 'prod-1',
        variantId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            ingredientId: 'ing-1',
            quantity: makeDecimal(1),
            unit: 'kg',
            ingredient: {
              id: 'ing-1',
              name: 'Sugar',
              costPerUnit: makeDecimal(16000),
              unit: 'kg',
              businessId: 'biz-1',
              sku: null,
              imageUrl: null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            id: 'ri-1',
            recipeId: 'recipe-1',
            createdAt: new Date(),
          },
        ],
      };

      const movements = [
        {
          id: 'mv-1',
          ingredientId: 'ing-1',
          movementType: 'purchase',
          quantity: makeDecimal(10),
          createdAt: new Date('2026-01-10'),
          ingredient: {
            id: 'ing-1',
            name: 'Sugar',
            costPerUnit: makeDecimal(14000),
          },
          outletId: 'outlet-1',
          referenceId: null,
          referenceType: null,
          notes: null,
          createdBy: null,
        },
        {
          id: 'mv-2',
          ingredientId: 'ing-1',
          movementType: 'purchase',
          quantity: makeDecimal(20),
          createdAt: new Date('2026-01-20'),
          ingredient: {
            id: 'ing-1',
            name: 'Sugar',
            costPerUnit: makeDecimal(14000),
          },
          outletId: 'outlet-1',
          referenceId: null,
          referenceType: null,
          notes: null,
          createdBy: null,
        },
      ];

      (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(recipe);
      (mockPrisma.ingredientStockMovement.findMany as jest.Mock).mockResolvedValue(movements);

      // Act
      const result = await service.getRecipeCostHistory('recipe-1');

      // Assert
      expect(result.history).toHaveLength(2);
      expect(result.history[0].date).toEqual(new Date('2026-01-10'));
      expect(result.history[1].date).toEqual(new Date('2026-01-20'));
    });
  });

  // ==========================================================================
  // CSV parsing helpers
  // ==========================================================================

  describe('parseCsvToIngredientItems', () => {
    it('should parse valid CSV data', () => {
      // Arrange
      const csv = `name,unit,costPerUnit,sku
Sugar,kg,15000,ING-001
Flour,kg,12000,ING-002`;

      // Act
      const result = service.parseCsvToIngredientItems(csv);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sugar');
      expect(result[0].unit).toBe('kg');
      expect(result[0].costPerUnit).toBe(15000);
      expect(result[0].sku).toBe('ING-001');
    });

    it('should return empty array for empty CSV', () => {
      // Act
      const result = service.parseCsvToIngredientItems('');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for header-only CSV', () => {
      // Act
      const result = service.parseCsvToIngredientItems('name,unit,costPerUnit');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('parseJsonToIngredientItems', () => {
    it('should parse valid JSON array', () => {
      // Arrange
      const json = JSON.stringify([{ name: 'Sugar', unit: 'kg', costPerUnit: 15000 }]);

      // Act
      const result = service.parseJsonToIngredientItems(json);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sugar');
    });

    it('should throw BadRequestException for non-array JSON', () => {
      // Arrange
      const json = JSON.stringify({ name: 'Not an array' });

      // Act & Assert
      expect(() => service.parseJsonToIngredientItems(json)).toThrow(BadRequestException);
    });
  });
});
