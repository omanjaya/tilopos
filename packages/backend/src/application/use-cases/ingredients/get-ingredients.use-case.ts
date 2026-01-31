import { Inject, Injectable } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface GetIngredientsParams {
  businessId: string;
  activeOnly?: boolean;
}

@Injectable()
export class GetIngredientsUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(params: GetIngredientsParams) {
    const ingredients = await this.ingredientRepository.findByBusiness(
      params.businessId,
      params.activeOnly ?? true,
    );

    return ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      sku: ingredient.sku,
      unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit,
      imageUrl: ingredient.imageUrl,
      isActive: ingredient.isActive,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    }));
  }
}
