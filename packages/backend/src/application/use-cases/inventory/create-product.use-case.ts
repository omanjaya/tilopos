import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { money } from '@shared/utils/money';

export interface VariantInput {
  name: string;
  sku?: string;
  barcode?: string;
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

/**
 * Creates a product with its variants, modifier links, outlet assignments and
 * initial stock rows in ONE transaction using set-based inserts (R9, R13).
 * Category and modifier groups must belong to the caller's business (R3).
 */
@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  async execute(input: CreateProductInput): Promise<CreateProductOutput> {
    await this.tenant.assertOwned('category', input.categoryId, input.businessId);
    await this.tenant.assertOwned('modifierGroup', input.modifierGroupIds, input.businessId);

    const variants = input.variants ?? [];
    const hasVariants = variants.length > 0;
    const productId = randomUUID();
    const variantIds = variants.map(() => randomUUID());

    try {
      await this.prisma.$transaction(async (tx) => {
        // Serialise SKU assignment per business (variant SKUs have no DB unique).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sku:${input.businessId}`}))`;

        const variantSkus = variants.map((v) => v.sku).filter((s): s is string => !!s);
        if (new Set(variantSkus).size !== variantSkus.length) {
          throw new ConflictException('Variant SKUs must be unique');
        }
        if (variantSkus.length > 0) {
          const taken = await tx.productVariant.findFirst({
            where: {
              sku: { in: variantSkus },
              isActive: true,
              product: { businessId: input.businessId },
            },
            select: { sku: true },
          });
          if (taken) throw new ConflictException(`SKU ${taken.sku} already exists`);
        }

        await tx.product.create({
          data: {
            id: productId,
            businessId: input.businessId,
            categoryId: input.categoryId || null,
            sku: input.sku || null,
            name: input.name,
            description: input.description || null,
            imageUrl: input.imageUrl || null,
            basePrice: money(input.basePrice),
            costPrice: input.costPrice !== undefined ? money(input.costPrice) : null,
            hasVariants,
            trackStock: input.trackStock,
          },
        });

        if (hasVariants) {
          await tx.productVariant.createMany({
            data: variants.map((v, i) => ({
              id: variantIds[i],
              productId,
              sku: v.sku || null,
              barcode: v.barcode || null,
              name: v.name,
              price: money(v.price),
              costPrice: v.costPrice !== undefined ? money(v.costPrice) : null,
            })),
          });
        }

        if (input.modifierGroupIds && input.modifierGroupIds.length > 0) {
          await tx.productModifierGroup.createMany({
            data: input.modifierGroupIds.map((modifierGroupId, sortOrder) => ({
              productId,
              modifierGroupId,
              sortOrder,
            })),
            skipDuplicates: true,
          });
        }

        const outlets = await tx.outlet.findMany({
          where: { businessId: input.businessId, isActive: true },
          select: { id: true },
        });
        if (outlets.length === 0) return;

        // Auto-assign product to all active outlets
        await tx.outletProduct.createMany({
          data: outlets.map((o) => ({ outletId: o.id, productId, isActive: true })),
          skipDuplicates: true,
        });

        if (input.trackStock) {
          const perOutletVariants: Array<string | null> = hasVariants ? variantIds : [null];
          const stockRows: Prisma.StockLevelCreateManyInput[] = outlets.flatMap((o) =>
            perOutletVariants.map((variantId) => ({
              outletId: o.id,
              productId,
              variantId,
              quantity: 0,
            })),
          );
          await tx.stockLevel.createMany({ data: stockRows, skipDuplicates: true });
        }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          input.sku ? `SKU ${input.sku} already exists` : 'Product already exists',
        );
      }
      throw err;
    }

    return { productId, variantIds };
  }
}
