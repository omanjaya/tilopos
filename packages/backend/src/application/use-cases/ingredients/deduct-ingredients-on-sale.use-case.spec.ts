import {
  DeductIngredientsOnSaleUseCase,
  DeductIngredientsInput,
} from './deduct-ingredients-on-sale.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

// Helper to create a Decimal-like object matching Prisma's Decimal behavior
function decimal(value: number) {
  return { toNumber: () => value };
}

describe('DeductIngredientsOnSaleUseCase', () => {
  let useCase: DeductIngredientsOnSaleUseCase;
  let mockPrisma: {
    recipe: { findFirst: jest.Mock };
    ingredientStockLevel: { findFirst: jest.Mock; update: jest.Mock };
    ingredientStockMovement: { create: jest.Mock };
  };

  beforeEach(() => {
    mockPrisma = {
      recipe: {
        findFirst: jest.fn(),
      },
      ingredientStockLevel: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      ingredientStockMovement: {
        create: jest.fn(),
      },
    };

    useCase = new DeductIngredientsOnSaleUseCase(mockPrisma as unknown as PrismaService);
  });

  const baseInput: DeductIngredientsInput = {
    outletId: 'outlet-1',
    transactionId: 'txn-1',
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  it('should deduct correct quantities based on recipe', async () => {
    const recipe = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          quantity: decimal(0.2),
          unit: 'kg',
          ingredient: { id: 'ing-rice', name: 'Rice' },
        },
        {
          id: 'ri-2',
          recipeId: 'recipe-1',
          ingredientId: 'ing-oil',
          quantity: decimal(0.05),
          unit: 'liter',
          ingredient: { id: 'ing-oil', name: 'Cooking Oil' },
        },
      ],
    };

    const riceStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-rice',
      quantity: decimal(10),
      lowStockAlert: decimal(2),
    };

    const oilStock = {
      id: 'is-2',
      outletId: 'outlet-1',
      ingredientId: 'ing-oil',
      quantity: decimal(5),
      lowStockAlert: decimal(1),
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst
      .mockResolvedValueOnce(riceStock)
      .mockResolvedValueOnce(oilStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    const result = await useCase.execute(baseInput);

    // Rice: 0.2 kg per serving * 2 quantity = 0.4 kg deducted
    // Remaining: 10 - 0.4 = 9.6
    expect(result.deductions).toHaveLength(2);
    expect(result.deductions[0]).toEqual({
      ingredientId: 'ing-rice',
      ingredientName: 'Rice',
      quantityDeducted: 0.4,
      remainingStock: 9.6,
      isBelowAlert: false,
    });

    // Oil: 0.05 liter per serving * 2 = 0.1 liter deducted
    // Remaining: 5 - 0.1 = 4.9
    expect(result.deductions[1]).toEqual({
      ingredientId: 'ing-oil',
      ingredientName: 'Cooking Oil',
      quantityDeducted: 0.1,
      remainingStock: 4.9,
      isBelowAlert: false,
    });

    // Verify stock level update for rice
    expect(mockPrisma.ingredientStockLevel.update).toHaveBeenCalledWith({
      where: { id: 'is-1' },
      data: { quantity: 9.6 },
    });

    // Verify stock movement created for rice
    expect(mockPrisma.ingredientStockMovement.create).toHaveBeenCalledWith({
      data: {
        outletId: 'outlet-1',
        ingredientId: 'ing-rice',
        movementType: 'usage',
        quantity: -0.4,
        referenceId: 'txn-1',
        referenceType: 'transaction',
      },
    });
  });

  it('should handle product with no recipe (no-op)', async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);

    const result = await useCase.execute(baseInput);

    expect(result.deductions).toHaveLength(0);
    expect(mockPrisma.ingredientStockLevel.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.ingredientStockLevel.update).not.toHaveBeenCalled();
    expect(mockPrisma.ingredientStockMovement.create).not.toHaveBeenCalled();
  });

  it('should handle ingredient with no stock level record (skip)', async () => {
    const recipe = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-unknown',
          quantity: decimal(0.5),
          unit: 'kg',
          ingredient: { id: 'ing-unknown', name: 'Unknown Ingredient' },
        },
      ],
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst.mockResolvedValue(null);

    const result = await useCase.execute(baseInput);

    expect(result.deductions).toHaveLength(0);
    expect(mockPrisma.ingredientStockLevel.update).not.toHaveBeenCalled();
  });

  it('should handle quantity multiplier correctly', async () => {
    const recipe = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          quantity: decimal(0.3),
          unit: 'kg',
          ingredient: { id: 'ing-rice', name: 'Rice' },
        },
      ],
    };

    const riceStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-rice',
      quantity: decimal(5),
      lowStockAlert: decimal(1),
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst.mockResolvedValue(riceStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    // Ordering 5 portions
    const input: DeductIngredientsInput = {
      outletId: 'outlet-1',
      transactionId: 'txn-1',
      items: [{ productId: 'prod-1', quantity: 5 }],
    };

    const result = await useCase.execute(input);

    // 0.3 kg * 5 = 1.5 kg deducted
    // Remaining: 5 - 1.5 = 3.5
    expect(result.deductions[0].quantityDeducted).toBe(1.5);
    expect(result.deductions[0].remainingStock).toBe(3.5);
  });

  it('should set remaining stock to zero when deduction exceeds current stock', async () => {
    const recipe = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          quantity: decimal(1),
          unit: 'kg',
          ingredient: { id: 'ing-rice', name: 'Rice' },
        },
      ],
    };

    const riceStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-rice',
      quantity: decimal(1),
      lowStockAlert: decimal(2),
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst.mockResolvedValue(riceStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    // Ordering 3 portions: needs 3 kg but only 1 kg available
    const input: DeductIngredientsInput = {
      outletId: 'outlet-1',
      transactionId: 'txn-1',
      items: [{ productId: 'prod-1', quantity: 3 }],
    };

    const result = await useCase.execute(input);

    // newQty = 1 - 3 = -2, Math.max(0, -2) = 0
    expect(result.deductions[0].remainingStock).toBe(0);

    // Stock update should set to 0 (clamped)
    expect(mockPrisma.ingredientStockLevel.update).toHaveBeenCalledWith({
      where: { id: 'is-1' },
      data: { quantity: 0 },
    });
  });

  it('should flag ingredient as below alert threshold', async () => {
    const recipe = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          quantity: decimal(0.5),
          unit: 'kg',
          ingredient: { id: 'ing-rice', name: 'Rice' },
        },
      ],
    };

    const riceStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-rice',
      quantity: decimal(3),
      lowStockAlert: decimal(5),
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst.mockResolvedValue(riceStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    const result = await useCase.execute(baseInput);

    // 0.5 * 2 = 1 kg deducted, remaining = 3 - 1 = 2
    // 2 <= 5 (lowStockAlert) -> isBelowAlert = true
    expect(result.deductions[0].isBelowAlert).toBe(true);
    expect(result.deductions[0].remainingStock).toBe(2);
  });

  it('should handle multiple items in a single transaction', async () => {
    const recipe1 = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          quantity: decimal(0.2),
          unit: 'kg',
          ingredient: { id: 'ing-rice', name: 'Rice' },
        },
      ],
    };

    const recipe2 = {
      id: 'recipe-2',
      productId: 'prod-2',
      variantId: null,
      items: [
        {
          id: 'ri-2',
          recipeId: 'recipe-2',
          ingredientId: 'ing-noodle',
          quantity: decimal(0.15),
          unit: 'kg',
          ingredient: { id: 'ing-noodle', name: 'Noodle' },
        },
      ],
    };

    const riceStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-rice',
      quantity: decimal(10),
      lowStockAlert: decimal(2),
    };

    const noodleStock = {
      id: 'is-2',
      outletId: 'outlet-1',
      ingredientId: 'ing-noodle',
      quantity: decimal(8),
      lowStockAlert: decimal(1),
    };

    mockPrisma.recipe.findFirst.mockResolvedValueOnce(recipe1).mockResolvedValueOnce(recipe2);
    mockPrisma.ingredientStockLevel.findFirst
      .mockResolvedValueOnce(riceStock)
      .mockResolvedValueOnce(noodleStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    const input: DeductIngredientsInput = {
      outletId: 'outlet-1',
      transactionId: 'txn-1',
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 3 },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.deductions).toHaveLength(2);

    // Rice: 0.2 * 2 = 0.4 deducted
    expect(result.deductions[0].ingredientName).toBe('Rice');
    expect(result.deductions[0].quantityDeducted).toBeCloseTo(0.4);

    // Noodle: 0.15 * 3 = 0.45 deducted
    expect(result.deductions[1].ingredientName).toBe('Noodle');
    expect(result.deductions[1].quantityDeducted).toBeCloseTo(0.45);
  });

  it('should handle variant-specific recipe', async () => {
    const recipe = {
      id: 'recipe-v1',
      productId: 'prod-1',
      variantId: 'var-spicy',
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-v1',
          ingredientId: 'ing-chili',
          quantity: decimal(0.1),
          unit: 'kg',
          ingredient: { id: 'ing-chili', name: 'Chili' },
        },
      ],
    };

    const chiliStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-chili',
      quantity: decimal(2),
      lowStockAlert: decimal(0.5),
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst.mockResolvedValue(chiliStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    const input: DeductIngredientsInput = {
      outletId: 'outlet-1',
      transactionId: 'txn-1',
      items: [{ productId: 'prod-1', variantId: 'var-spicy', quantity: 1 }],
    };

    const result = await useCase.execute(input);

    expect(result.deductions[0].ingredientName).toBe('Chili');
    expect(result.deductions[0].quantityDeducted).toBe(0.1);
    expect(result.deductions[0].remainingStock).toBe(1.9);

    expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
      where: { productId: 'prod-1', variantId: 'var-spicy' },
      include: { items: { include: { ingredient: true } } },
    });
  });

  it('should record stock movement for each ingredient deduction', async () => {
    const recipe = {
      id: 'recipe-1',
      productId: 'prod-1',
      variantId: null,
      items: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          quantity: decimal(0.3),
          unit: 'kg',
          ingredient: { id: 'ing-rice', name: 'Rice' },
        },
      ],
    };

    const riceStock = {
      id: 'is-1',
      outletId: 'outlet-1',
      ingredientId: 'ing-rice',
      quantity: decimal(10),
      lowStockAlert: decimal(2),
    };

    mockPrisma.recipe.findFirst.mockResolvedValue(recipe);
    mockPrisma.ingredientStockLevel.findFirst.mockResolvedValue(riceStock);
    mockPrisma.ingredientStockLevel.update.mockResolvedValue({});
    mockPrisma.ingredientStockMovement.create.mockResolvedValue({});

    await useCase.execute(baseInput);

    // 0.3 * 2 = 0.6
    expect(mockPrisma.ingredientStockMovement.create).toHaveBeenCalledWith({
      data: {
        outletId: 'outlet-1',
        ingredientId: 'ing-rice',
        movementType: 'usage',
        quantity: -0.6,
        referenceId: 'txn-1',
        referenceType: 'transaction',
      },
    });
  });

  it('should query recipe with null variantId when no variant specified', async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);

    await useCase.execute(baseInput);

    expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
      where: { productId: 'prod-1', variantId: null },
      include: { items: { include: { ingredient: true } } },
    });
  });

  it('should return empty deductions when all items have no recipes', async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);

    const input: DeductIngredientsInput = {
      outletId: 'outlet-1',
      transactionId: 'txn-1',
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 3 },
        { productId: 'prod-3', quantity: 1 },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.deductions).toHaveLength(0);
    expect(mockPrisma.recipe.findFirst).toHaveBeenCalledTimes(3);
  });
});
