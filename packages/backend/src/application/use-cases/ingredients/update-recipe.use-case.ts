import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface UpdateRecipeParams {
  id: string;
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
  ) {}

  async execute(params: UpdateRecipeParams) {
    const recipe = await this.ingredientRepository.findRecipeById(params.id);
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Validate ingredients exist (if items provided)
    if (params.items) {
      for (const item of params.items) {
        const ingredient = await this.ingredientRepository.findById(item.ingredientId);
        if (!ingredient) {
          throw new NotFoundException(`Ingredient ${item.ingredientId} not found`);
        }
      }
    }

    // Update recipe
    const updated = await this.ingredientRepository.updateRecipe(params.id, {
      notes: params.notes,
      items: params.items,
    });

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
