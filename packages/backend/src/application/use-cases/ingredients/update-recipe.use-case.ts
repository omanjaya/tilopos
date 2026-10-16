import { Inject, Injectable } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { TenantAccessService } from '../../../shared/tenant';

export interface UpdateRecipeParams {
  id: string;
  businessId: string;
  notes?: string;
  items?: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
  }>;
}

@Injectable()
export class UpdateRecipeUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
    private readonly tenant: TenantAccessService,
  ) {}

  async execute(params: UpdateRecipeParams) {
    if (params.items) {
      // One query for all ingredient ids, scoped to the business.
      await this.tenant.assertOwned(
        'ingredient',
        params.items.map((i) => i.ingredientId),
        params.businessId,
      );
    }

    // Ownership check + item replacement run in one transaction in the repository.
    const updated = await this.ingredientRepository.updateRecipe(
      params.id,
      { notes: params.notes, items: params.items },
      params.businessId,
    );

    return {
      id: updated.id,
      productId: updated.productId,
      variantId: updated.variantId,
      notes: updated.notes,
      items: updated.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
      updatedAt: updated.updatedAt,
    };
  }
}
