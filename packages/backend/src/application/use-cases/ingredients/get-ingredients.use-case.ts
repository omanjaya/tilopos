import { Inject, Injectable } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface GetIngredientsParams {
  businessId: string;
  activeOnly?: boolean;
  skip?: number;
  take?: number;
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
      { skip: params.skip, take: params.take },
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
