import { Inject, Injectable } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface GetRecipesParams {
  businessId: string;
  productId?: string;
  variantId?: string;
}

@Injectable()
export class GetRecipesUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  /** Recipes of a product of the caller's business; foreign products yield []. */
  async execute(params: GetRecipesParams) {
    if (!params.productId) return [];

    const recipes = await this.ingredientRepository.findRecipesByProduct(
      params.productId,
      params.variantId,
      params.businessId,
    );
    return recipes.map((recipe) => ({
      id: recipe.id,
      productId: recipe.productId,
      variantId: recipe.variantId,
      notes: recipe.notes,
      items: recipe.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    }));
  }
}
