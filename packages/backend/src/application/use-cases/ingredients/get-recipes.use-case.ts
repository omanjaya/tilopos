import { Inject, Injectable } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface GetRecipesParams {
  productId?: string;
  variantId?: string;
}

@Injectable()
export class GetRecipesUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(params: GetRecipesParams) {
    if (params.productId) {
      const recipes = await this.ingredientRepository.findRecipesByProduct(
        params.productId,
        params.variantId,
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

    return [];
  }
}
