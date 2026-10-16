import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface OrderItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  station?: string;
  notes?: string;
}

export interface ResolvedOrderItem {
  productId: string;
  variantId: string | null;
  productName: string;
  quantity: number;
  station: string | null;
  notes: string | null;
}

export const MAX_ITEM_QUANTITY = 999;

type ProductReader = Pick<Prisma.TransactionClient, 'product' | 'productVariant'>;

/** Rejects non-integer, zero, negative or absurd quantities (R6 defence in depth). */
export function assertValidQuantity(quantity: unknown): void {
  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_ITEM_QUANTITY
  ) {
    throw new BadRequestException(`Quantity must be an integer between 1 and ${MAX_ITEM_QUANTITY}`);
  }
}

/**
 * Resolves client order lines against the catalogue of `businessId`.
 * Unknown, inactive or foreign products/variants are rejected (R3) instead of
 * silently becoming "Unknown" lines.
 */
export async function resolveOrderItems(
  db: ProductReader,
  businessId: string,
  items: readonly OrderItemRequest[],
): Promise<ResolvedOrderItem[]> {
  if (!businessId) {
    throw new BadRequestException('Business context required');
  }
  for (const item of items) {
    assertValidQuantity(item.quantity);
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds }, businessId, isActive: true },
        select: { id: true, name: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const variantIds = [...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v))];
  const variants = variantIds.length
    ? await db.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true, product: { businessId } },
        select: { id: true, productId: true },
      })
    : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));

  return items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new BadRequestException(`Product ${item.productId} not found or inactive`);
    }
    if (item.variantId) {
      const variant = variantById.get(item.variantId);
      if (!variant || variant.productId !== product.id) {
        throw new BadRequestException(`Variant ${item.variantId} not found for this product`);
      }
    }
    return {
      productId: product.id,
      variantId: item.variantId ?? null,
      productName: product.name,
      quantity: item.quantity,
      station: item.station ?? null,
      notes: item.notes ?? null,
    };
  });
}
