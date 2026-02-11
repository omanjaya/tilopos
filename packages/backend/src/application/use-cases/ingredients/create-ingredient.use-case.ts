import { Inject, Injectable } from '@nestjs/common';
import { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

export interface CreateIngredientParams {
  businessId: string;
  name: string;
  sku?: string;
  unit: string;
  costPerUnit?: number;
  imageUrl?: string;
}

@Injectable()
export class CreateIngredientUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(params: CreateIngredientParams) {
    // Check if SKU already exists (if provided)
    if (params.sku) {
      const existing = await this.ingredientRepository.findBySKU(params.businessId, params.sku);
      if (existing) {
        throw new AppError(ErrorCode.DUPLICATE_RESOURCE, 'Ingredient with this SKU already exists');
      }
    }

    // Create ingredient
    const ingredient = await this.ingredientRepository.create({
      businessId: params.businessId,
      name: params.name,
      sku: params.sku,
      unit: params.unit,
      costPerUnit: params.costPerUnit,
      imageUrl: params.imageUrl,
    });

    return {
      id: ingredient.id,
      name: ingredient.name,
      sku: ingredient.sku,
      unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit,
      imageUrl: ingredient.imageUrl,
      isActive: ingredient.isActive,
      createdAt: ingredient.createdAt,
    };
  }
}
