import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '../../shared/tenant';

/** Minimal shape of a transfer line that moves stock. */
export interface TransferLine {
  productId?: string | null;
  variantId?: string | null;
  ingredientId?: string | null;
  itemName: string;
}

type Tx = Prisma.TransactionClient;

/** A client-supplied transfer template id must belong to the caller's business (R3). */
export async function assertTemplateOwned(
  prisma: PrismaService | Tx,
  businessId: string,
  templateId: string | undefined | null,
): Promise<void> {
  if (!templateId) return;
  const template = await prisma.transferTemplate.findFirst({
    where: { id: templateId, businessId },
    select: { id: true },
  });
  if (!template) {
    throw new BadRequestException('Template transfer tidak ditemukan');
  }
}

/**
 * Validates that every client-supplied item id belongs to the caller's business
 * (R3) and that each line is either a product (optionally one of its variants)
 * or an ingredient — never both, never neither.
 */
export async function assertTransferItemsOwned(
  prisma: PrismaService | Tx,
  tenant: TenantAccessService,
  businessId: string,
  items: readonly TransferLine[],
): Promise<void> {
  for (const item of items) {
    const hasProduct = !!item.productId;
    const hasIngredient = !!item.ingredientId;
    if (hasProduct === hasIngredient) {
      throw new BadRequestException(
        `Item "${item.itemName}" harus memiliki tepat satu dari productId atau ingredientId`,
      );
    }
    if (item.variantId && !item.productId) {
      throw new BadRequestException(`Item "${item.itemName}": variantId membutuhkan productId`);
    }
  }

  await tenant.assertOwned(
    'product',
    items.map((i) => i.productId),
    businessId,
  );
  await tenant.assertOwned(
    'ingredient',
    items.map((i) => i.ingredientId),
    businessId,
  );

  const variantIds = [...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v))];
  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, product: { businessId } },
      select: { id: true, productId: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v.productId]));
    for (const item of items) {
      if (item.variantId && byId.get(item.variantId) !== item.productId) {
        throw new ForbiddenException('One or more productVariant references are not accessible');
      }
    }
  }
}

/**
 * Removes `qty` from an outlet with a conditional decrement (quantity >= qty),
 * so concurrent sales/transfers can never drive stock negative (R9).
 * A null variantId matches only the product's base row.
 */
export async function decrementStock(
  tx: Tx,
  outletId: string,
  item: TransferLine,
  qty: number,
): Promise<void> {
  if (qty <= 0) return;
  const result = item.ingredientId
    ? await tx.ingredientStockLevel.updateMany({
        where: { outletId, ingredientId: item.ingredientId, quantity: { gte: qty } },
        data: { quantity: { decrement: qty } },
      })
    : await tx.stockLevel.updateMany({
        where: {
          outletId,
          productId: item.productId as string,
          variantId: item.variantId ?? null,
          quantity: { gte: qty },
        },
        data: { quantity: { decrement: qty } },
      });
  if (result.count === 0) {
    throw new ConflictException(
      `Stok "${item.itemName}" di outlet asal tidak cukup (diminta: ${qty})`,
    );
  }
}

/** Adds `qty` to an outlet atomically, creating the stock row when it does not exist yet. */
export async function incrementStock(
  tx: Tx,
  outletId: string,
  item: TransferLine,
  qty: number,
): Promise<void> {
  if (qty <= 0) return;
  if (item.ingredientId) {
    await tx.ingredientStockLevel.upsert({
      where: { outletId_ingredientId: { outletId, ingredientId: item.ingredientId } },
      update: { quantity: { increment: qty } },
      create: { outletId, ingredientId: item.ingredientId, quantity: qty },
    });
    return;
  }

  // The compound unique (outlet, product, variant) cannot be used by upsert when
  // variantId is NULL, so: increment, else create (the partial unique index
  // uq_stock_outlet_product_no_variant turns a concurrent duplicate into P2002).
  const where = {
    outletId,
    productId: item.productId as string,
    variantId: item.variantId ?? null,
  };
  const updated = await tx.stockLevel.updateMany({
    where,
    data: { quantity: { increment: qty } },
  });
  if (updated.count > 0) return;
  await tx.stockLevel.create({
    data: {
      outletId,
      productId: item.productId as string,
      variantId: item.variantId ?? null,
      quantity: qty,
    },
  });
}

export interface MovementInput {
  outletId: string;
  item: TransferLine;
  /** Signed quantity: negative for transfer_out, positive for transfer_in. */
  quantity: number;
  movementType: 'transfer_in' | 'transfer_out';
  referenceId: string;
  referenceType: string;
  notes: string;
  createdBy: string | null;
}

/** Writes the stock ledger rows (StockMovement / IngredientStockMovement) in one batch each. */
export async function recordTransferMovements(
  tx: Tx,
  movements: readonly MovementInput[],
): Promise<void> {
  const relevant = movements.filter((m) => m.quantity !== 0);
  const productRows = relevant
    .filter((m) => !m.item.ingredientId)
    .map((m) => ({
      outletId: m.outletId,
      productId: m.item.productId ?? null,
      variantId: m.item.variantId ?? null,
      movementType: m.movementType,
      quantity: m.quantity,
      referenceId: m.referenceId,
      referenceType: m.referenceType,
      notes: m.notes,
      createdBy: m.createdBy,
    }));
  const ingredientRows = relevant
    .filter((m) => !!m.item.ingredientId)
    .map((m) => ({
      outletId: m.outletId,
      ingredientId: m.item.ingredientId as string,
      movementType: m.movementType,
      quantity: m.quantity,
      referenceId: m.referenceId,
      referenceType: m.referenceType,
      notes: m.notes,
      createdBy: m.createdBy,
    }));
  if (productRows.length > 0) {
    await tx.stockMovement.createMany({ data: productRows });
  }
  if (ingredientRows.length > 0) {
    await tx.ingredientStockMovement.createMany({ data: ingredientRows });
  }
}
