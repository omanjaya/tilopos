import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface UpdateIngredientParams {
  id: string;
  name?: string;
  sku?: string;
  unit?: string;
  costPerUnit?: number;
  imageUrl?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateIngredientUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(params: UpdateIngredientParams) {
    const ingredient = await this.ingredientRepository.findById(params.id);
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    // Update ingredient
    const updated = await this.ingredientRepository.update(params.id, {
      name: params.name,
      sku: params.sku,
      unit: params.unit,
      costPerUnit: params.costPerUnit,
      imageUrl: params.imageUrl,
      isActive: params.isActive,
    });

    return {
      id: updated.id,
      name: updated.name,
      sku: updated.sku,
      unit: updated.unit,
      costPerUnit: updated.costPerUnit,
      imageUrl: updated.imageUrl,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }
}
