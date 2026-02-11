import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';

export interface VariantInput {
  name: string;
  sku?: string;
  price: number;
  costPrice?: number;
}

export interface CreateProductInput {
  businessId: string;
  categoryId?: string;
  sku?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  costPrice?: number;
  trackStock: boolean;
  variants?: VariantInput[];
  modifierGroupIds?: string[];
}

export interface CreateProductOutput {
  productId: string;
  variantIds: string[];
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateProductInput): Promise<CreateProductOutput> {
    if (input.sku) {
      const existing = await this.productRepo.findBySku(input.businessId, input.sku);
      if (existing) {
        throw new BusinessError(ErrorCode.PRODUCT_NOT_FOUND, `SKU ${input.sku} already exists`);
      }
    }

    const hasVariants = !!(input.variants && input.variants.length > 0);

    const product = await this.prisma.product.create({
      data: {
        businessId: input.businessId,
        categoryId: input.categoryId || null,
        sku: input.sku || null,
        name: input.name,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        basePrice: input.basePrice,
        costPrice: input.costPrice || null,
        hasVariants,
        trackStock: input.trackStock,
      },
    });

    const variantIds: string[] = [];

    if (input.variants && input.variants.length > 0) {
      for (const v of input.variants) {
        const variant = await this.prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku || null,
            name: v.name,
            price: v.price,
            costPrice: v.costPrice || null,
          },
        });
        variantIds.push(variant.id);
      }
    }

    if (input.modifierGroupIds && input.modifierGroupIds.length > 0) {
      for (let i = 0; i < input.modifierGroupIds.length; i++) {
        await this.prisma.productModifierGroup.create({
          data: {
            productId: product.id,
            modifierGroupId: input.modifierGroupIds[i],
            sortOrder: i,
          },
        });
      }
    }

    const outlets = await this.prisma.outlet.findMany({
      where: { businessId: input.businessId, isActive: true },
      select: { id: true },
    });

    // Auto-assign product to all outlets
    for (const outlet of outlets) {
      await this.prisma.outletProduct.upsert({
        where: {
          outletId_productId: { outletId: outlet.id, productId: product.id },
        },
        create: { outletId: outlet.id, productId: product.id, isActive: true },
        update: { isActive: true },
      });
    }

    if (input.trackStock) {
      for (const outlet of outlets) {
        if (hasVariants) {
          for (const variantId of variantIds) {
            await this.prisma.stockLevel.create({
              data: {
                outletId: outlet.id,
                productId: product.id,
                variantId,
                quantity: 0,
              },
            });
          }
        } else {
          await this.prisma.stockLevel.create({
            data: {
              outletId: outlet.id,
              productId: product.id,
              quantity: 0,
            },
          });
        }
      }
    }

    return {
      productId: product.id,
      variantIds,
    };
  }
}
