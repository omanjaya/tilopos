import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateRecipeUseCase } from './create-recipe.use-case';
import type { PrismaIngredientRepository } from '../../../infrastructure/repositories/prisma-ingredient.repository';
import type { TenantAccessService } from '../../../shared/tenant';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('CreateRecipeUseCase (tenant scoping)', () => {
  const repo = {
    findRecipesByProduct: jest.fn().mockResolvedValue([]),
    createRecipe: jest.fn().mockResolvedValue({
      id: 'rec-1',
      productId: 'prod-1',
      variantId: null,
      notes: null,
      items: [],
      createdAt: new Date(),
    }),
  };
  const tenant = { assertOwned: jest.fn().mockResolvedValue(undefined) };
  const prisma = { productVariant: { count: jest.fn().mockResolvedValue(1) } };
  const useCase = new CreateRecipeUseCase(
    repo as unknown as PrismaIngredientRepository,
    tenant as unknown as TenantAccessService,
    prisma as unknown as PrismaService,
  );

  const params = {
    businessId: 'biz-1',
    productId: 'prod-1',
    items: [
      { ingredientId: 'ing-1', quantity: 1, unit: 'kg' },
      { ingredientId: 'ing-2', quantity: 2, unit: 'kg' },
    ],
  };

  beforeEach(() => jest.clearAllMocks());

  it('verifies product and all ingredients (one batched check) before creating', async () => {
    await useCase.execute(params);

    expect(tenant.assertOwned).toHaveBeenCalledWith('product', 'prod-1', 'biz-1');
    expect(tenant.assertOwned).toHaveBeenCalledWith('ingredient', ['ing-1', 'ing-2'], 'biz-1');
    expect(repo.findRecipesByProduct).toHaveBeenCalledWith('prod-1', null, 'biz-1');
    expect(repo.createRecipe).toHaveBeenCalled();
  });

  it('rejects a foreign ingredient and creates nothing', async () => {
    tenant.assertOwned.mockImplementation(async (model: string) => {
      if (model === 'ingredient') throw new ForbiddenException();
    });

    await expect(useCase.execute(params)).rejects.toThrow(ForbiddenException);
    expect(repo.createRecipe).not.toHaveBeenCalled();
  });

  it('rejects a variant that does not belong to the product', async () => {
    tenant.assertOwned.mockResolvedValue(undefined);
    prisma.productVariant.count.mockResolvedValue(0);

    await expect(useCase.execute({ ...params, variantId: 'var-x' })).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.createRecipe).not.toHaveBeenCalled();
  });
});
