import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface DeductIngredientsInput {
  outletId: string;
  transactionId: string;
  /** Recorded as createdBy on the movements (the cashier of the sale). */
  employeeId?: string | null;
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
  }[];
}

export interface IngredientDeduction {
  ingredientId: string;
  ingredientName: string;
  quantityDeducted: number;
  remainingStock: number;
  isBelowAlert: boolean;
  insufficientStock: boolean;
}

export interface DeductIngredientsOutput {
  /** true when this transaction was already deducted earlier (idempotent no-op). */
  alreadyApplied: boolean;
  deductions: IngredientDeduction[];
}

export interface RestoreIngredientsInput {
  outletId: string;
  transactionId: string;
  /** Recorded as createdBy on the movements (who voided the sale). */
  employeeId?: string | null;
  reason?: string;
}

export interface RestoreIngredientsOutput {
  alreadyApplied: boolean;
  restored: { ingredientId: string; quantityRestored: number }[];
}

/** Movement reference used for sale deductions and for their reversal on void. */
export const SALE_REFERENCE_TYPE = 'transaction';
export const VOID_REFERENCE_TYPE = 'transaction_void';

type Tx = Prisma.TransactionClient;

/**
 * THE single implementation of recipe-based ingredient deduction for a sale (F0748).
 *
 * - Atomic: runs in the caller's transaction (`tx`) or its own `$transaction`.
 * - Idempotent: a per-transaction advisory lock + "usage movement already exists" check
 *   make repeated/concurrent calls for the same sale a no-op.
 * - Batched: one recipe query for all sold products, quantities aggregated per ingredient,
 *   one movement insert.
 * - Never negative: each deduction is a guarded decrement (`quantity >= needed`); when
 *   stock is short, whatever is left is taken (row locked) and the movement is flagged.
 * - Tenant-safe: only recipes of products of the outlet's business are used.
 */
@Injectable()
export class DeductIngredientsOnSaleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: DeductIngredientsInput, tx?: Tx): Promise<DeductIngredientsOutput> {
    return tx ? this.deduct(tx, input) : this.prisma.$transaction((t) => this.deduct(t, input));
  }

  /** Reverses the usage recorded for a sale (void/refund), once. */
  async restore(input: RestoreIngredientsInput, tx?: Tx): Promise<RestoreIngredientsOutput> {
    return tx
      ? this.restoreIn(tx, input)
      : this.prisma.$transaction((t) => this.restoreIn(t, input));
  }

  private async lockSale(tx: Tx, transactionId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ingredients:${transactionId}`}))`;
  }

  private async deduct(tx: Tx, input: DeductIngredientsInput): Promise<DeductIngredientsOutput> {
    await this.lockSale(tx, input.transactionId);

    const already = await tx.ingredientStockMovement.findFirst({
      where: {
        outletId: input.outletId,
        referenceId: input.transactionId,
        referenceType: SALE_REFERENCE_TYPE,
        movementType: 'usage',
      },
      select: { id: true },
    });
    if (already) return { alreadyApplied: true, deductions: [] };

    const outlet = await tx.outlet.findUnique({
      where: { id: input.outletId },
      select: { businessId: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const productIds = [...new Set(input.items.map((i) => i.productId).filter(Boolean))];
    if (productIds.length === 0) return { alreadyApplied: false, deductions: [] };

    const recipes = await tx.recipe.findMany({
      where: { productId: { in: productIds }, product: { businessId: outlet.businessId } },
      select: {
        productId: true,
        variantId: true,
        items: { select: { ingredientId: true, quantity: true } },
      },
    });
    const recipeKey = (productId: string, variantId: string | null | undefined) =>
      `${productId}:${variantId ?? ''}`;
    const byKey = new Map(recipes.map((r) => [recipeKey(r.productId, r.variantId), r]));

    // Aggregate what the whole sale needs per ingredient.
    const needed = new Map<string, Prisma.Decimal>();
    for (const item of input.items) {
      if (!item.productId || !(item.quantity > 0)) continue;
      const recipe =
        (item.variantId && byKey.get(recipeKey(item.productId, item.variantId))) ||
        byKey.get(recipeKey(item.productId, null));
      if (!recipe) continue;
      for (const ri of recipe.items) {
        const qty = ri.quantity.times(item.quantity);
        needed.set(
          ri.ingredientId,
          (needed.get(ri.ingredientId) ?? new Prisma.Decimal(0)).plus(qty),
        );
      }
    }
    if (needed.size === 0) return { alreadyApplied: false, deductions: [] };

    // Deterministic order avoids deadlocks between concurrent sales.
    const ingredientIds = [...needed.keys()].sort();
    const taken = new Map<string, { amount: Prisma.Decimal; insufficient: boolean }>();

    for (const ingredientId of ingredientIds) {
      const need = needed.get(ingredientId)!;
      const guarded = await tx.ingredientStockLevel.updateMany({
        where: { outletId: input.outletId, ingredientId, quantity: { gte: need } },
        data: { quantity: { decrement: need } },
      });
      if (guarded.count === 1) {
        taken.set(ingredientId, { amount: need, insufficient: false });
        continue;
      }

      // Not enough (or not tracked at this outlet): lock the row and take what is left.
      const rows = await tx.$queryRaw<Array<{ id: string; quantity: Prisma.Decimal }>>`
        SELECT id, quantity FROM ingredient_stock_levels
        WHERE outlet_id = ${input.outletId}::uuid AND ingredient_id = ${ingredientId}::uuid
        FOR UPDATE
      `;
      if (rows.length === 0) continue; // ingredient not stocked at this outlet
      const available = Prisma.Decimal.max(new Prisma.Decimal(rows[0].quantity), 0);
      if (available.greaterThan(0)) {
        await tx.ingredientStockLevel.updateMany({
          where: { id: rows[0].id, quantity: { gte: available } },
          data: { quantity: { decrement: available } },
        });
      }
      taken.set(ingredientId, { amount: available, insufficient: true });
    }
    if (taken.size === 0) return { alreadyApplied: false, deductions: [] };

    await tx.ingredientStockMovement.createMany({
      data: [...taken.entries()].map(([ingredientId, t]) => ({
        outletId: input.outletId,
        ingredientId,
        movementType: 'usage' as const,
        quantity: t.amount.negated(),
        referenceId: input.transactionId,
        referenceType: SALE_REFERENCE_TYPE,
        notes: t.insufficient
          ? `Insufficient stock: needed ${needed.get(ingredientId)!.toString()}, deducted ${t.amount.toString()}`
          : null,
        createdBy: input.employeeId ?? null,
      })),
    });

    const levels = await tx.ingredientStockLevel.findMany({
      where: { outletId: input.outletId, ingredientId: { in: [...taken.keys()] } },
      select: {
        ingredientId: true,
        quantity: true,
        lowStockAlert: true,
        ingredient: { select: { name: true } },
      },
    });
    const levelById = new Map(levels.map((l) => [l.ingredientId, l]));

    const deductions: IngredientDeduction[] = [...taken.entries()].map(([ingredientId, t]) => {
      const level = levelById.get(ingredientId);
      const remaining = level?.quantity ?? new Prisma.Decimal(0);
      return {
        ingredientId,
        ingredientName: level?.ingredient.name ?? '',
        quantityDeducted: t.amount.toNumber(),
        remainingStock: remaining.toNumber(),
        isBelowAlert: level ? remaining.lessThanOrEqualTo(level.lowStockAlert) : false,
        insufficientStock: t.insufficient,
      };
    });

    return { alreadyApplied: false, deductions };
  }

  private async restoreIn(
    tx: Tx,
    input: RestoreIngredientsInput,
  ): Promise<RestoreIngredientsOutput> {
    await this.lockSale(tx, input.transactionId);

    const already = await tx.ingredientStockMovement.findFirst({
      where: {
        outletId: input.outletId,
        referenceId: input.transactionId,
        referenceType: VOID_REFERENCE_TYPE,
      },
      select: { id: true },
    });
    if (already) return { alreadyApplied: true, restored: [] };

    const usage = await tx.ingredientStockMovement.groupBy({
      by: ['ingredientId'],
      where: {
        outletId: input.outletId,
        referenceId: input.transactionId,
        referenceType: SALE_REFERENCE_TYPE,
        movementType: 'usage',
      },
      _sum: { quantity: true },
    });

    const restored = usage
      .map((u) => ({
        ingredientId: u.ingredientId,
        amount: new Prisma.Decimal(u._sum.quantity ?? 0).abs(),
      }))
      .filter((r) => r.amount.greaterThan(0))
      .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
    if (restored.length === 0) return { alreadyApplied: false, restored: [] };

    for (const r of restored) {
      await tx.ingredientStockLevel.updateMany({
        where: { outletId: input.outletId, ingredientId: r.ingredientId },
        data: { quantity: { increment: r.amount } },
      });
    }

    await tx.ingredientStockMovement.createMany({
      data: restored.map((r) => ({
        outletId: input.outletId,
        ingredientId: r.ingredientId,
        movementType: 'adjustment' as const,
        quantity: r.amount,
        referenceId: input.transactionId,
        referenceType: VOID_REFERENCE_TYPE,
        notes: `Restored from voided transaction ${input.transactionId}${input.reason ? `: ${input.reason}` : ''}`,
        createdBy: input.employeeId ?? null,
      })),
    });

    return {
      alreadyApplied: false,
      restored: restored.map((r) => ({
        ingredientId: r.ingredientId,
        quantityRestored: r.amount.toNumber(),
      })),
    };
  }
}
