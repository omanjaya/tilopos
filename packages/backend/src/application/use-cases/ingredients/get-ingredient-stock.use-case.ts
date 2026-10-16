import { Inject, Injectable } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface GetIngredientStockParams {
  businessId: string;
  /** Must already be verified to belong to `businessId`. */
  outletId: string;
  lowStockOnly?: boolean;
}

@Injectable()
export class GetIngredientStockUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INGREDIENT)
    private readonly ingredientRepository: IIngredientRepository,
  ) {}

  async execute(params: GetIngredientStockParams) {
    if (params.lowStockOnly) {
      const lowStock = await this.ingredientRepository.getLowStock(
        params.outletId,
        params.businessId,
      );
      return lowStock.map((stock) => ({
        id: stock.id,
        outletId: stock.outletId,
        ingredientId: stock.ingredientId,
        quantity: stock.quantity,
        lowStockAlert: stock.lowStockAlert,
        isLow: stock.quantity <= stock.lowStockAlert,
        ingredient: {
          id: stock.ingredient.id,
          name: stock.ingredient.name,
          sku: stock.ingredient.sku,
          unit: stock.ingredient.unit,
        },
        updatedAt: stock.updatedAt,
      }));
    }

    const stocks = await this.ingredientRepository.getStockLevelsByOutlet(
      params.outletId,
      params.businessId,
    );
    return stocks.map((stock) => ({
      id: stock.id,
      outletId: stock.outletId,
      ingredientId: stock.ingredientId,
      quantity: stock.quantity,
      lowStockAlert: stock.lowStockAlert,
      isLow: stock.quantity <= stock.lowStockAlert,
      ingredient: stock.ingredient
        ? {
            id: stock.ingredient.id,
            name: stock.ingredient.name,
            sku: stock.ingredient.sku,
            unit: stock.ingredient.unit,
          }
        : undefined,
      updatedAt: stock.updatedAt,
    }));
  }
}
