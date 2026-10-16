import { Inject, Injectable } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface UpdateIngredientParams {
  id: string;
  businessId: string;
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
    // Scoped update (updateMany where { id, businessId }); 404 when not in the business.
    const updated = await this.ingredientRepository.update(
      params.id,
      {
        name: params.name,
        sku: params.sku,
        unit: params.unit,
        costPerUnit: params.costPerUnit,
        imageUrl: params.imageUrl,
        isActive: params.isActive,
      },
      params.businessId,
    );

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
