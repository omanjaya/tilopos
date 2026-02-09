import { Inject, Injectable } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

export interface CreateRecipeParams {
  productId: string;
  variantId?: string;
  notes?: string;
  items: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
  }>;
}

@Injectable()
export class CreateRecipeUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(params: CreateRecipeParams) {
    // Check if recipe already exists for this product/variant
    const existing = await this.ingredientRepository.findRecipesByProduct(
      params.productId,
      params.variantId,
    );
    if (existing.length > 0) {
      throw new AppError(
        'Recipe already exists for this product/variant',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    // Validate ingredients exist
    for (const item of params.items) {
      const ingredient = await this.ingredientRepository.findById(item.ingredientId);
      if (!ingredient) {
        throw new AppError(
          `Ingredient ${item.ingredientId} not found`,
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }
    }

    // Create recipe
    const recipe = await this.ingredientRepository.createRecipe({
      productId: params.productId,
      variantId: params.variantId,
      notes: params.notes,
      items: params.items,
    });

    return {
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
    };
  }
}
