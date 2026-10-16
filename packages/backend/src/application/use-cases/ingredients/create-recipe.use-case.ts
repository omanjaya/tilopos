import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IIngredientRepository } from '../../../domain/interfaces/repositories/ingredient.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { TenantAccessService } from '../../../shared/tenant';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

export interface CreateRecipeParams {
  businessId: string;
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
    private readonly tenant: TenantAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(params: CreateRecipeParams) {
    // Product, variant (of that product) and every ingredient must belong to the business.
    await this.tenant.assertOwned('product', params.productId, params.businessId);
    if (params.variantId) {
      const variant = await this.prisma.productVariant.count({
        where: { id: params.variantId, productId: params.productId },
      });
      if (variant === 0) throw new NotFoundException('Variant not found for this product');
    }
    await this.tenant.assertOwned(
      'ingredient',
      params.items.map((i) => i.ingredientId),
      params.businessId,
    );

    // Exactly one recipe per product/variant (base recipe = variantId null).
    const existing = await this.ingredientRepository.findRecipesByProduct(
      params.productId,
      params.variantId ?? null,
      params.businessId,
    );
    if (existing.length > 0) {
      throw new AppError(
        ErrorCode.DUPLICATE_RESOURCE,
        'Recipe already exists for this product/variant',
      );
    }

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
