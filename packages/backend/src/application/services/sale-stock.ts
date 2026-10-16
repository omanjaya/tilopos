import { Logger } from '@nestjs/common';
import { Prisma, type StockMovementType } from '@prisma/client';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { money } from '@shared/utils/money';

export interface StockChange {
  productId: string;
  variantId: string | null;
  previousQty: number;
  newQty: number;
}

export interface StockDeductionLine {
  productId: string;
  variantId: string | null;
  quantity: Prisma.Decimal | number;
  note: string;
}

export interface ApplyStockOptions {
  outletId: string;
  referenceId: string;
  referenceType: string;
  employeeId: string | null;
  movementType: StockMovementType;
  /** 'deduct' requires quantity >= n (atomic conditional decrement); 'restore' increments. */
  direction: 'deduct' | 'restore';
  logger?: Logger;
}

const logger = new Logger('SaleStock');

/**
 * Applies stock changes inside the caller's `$transaction` (R9):
 * lines for the same product/variant are aggregated, every change is a single
 * atomic `UPDATE ... SET quantity = quantity -/+ n` (deductions guarded by
 * `quantity >= n`), and one movement row is written per product/variant.
 * Products without a stock_levels row at the outlet are skipped with a warning
 * (stock not initialised), matching the previous behaviour.
 */
export async function applyStockChanges(
  tx: Prisma.TransactionClient,
  lines: StockDeductionLine[],
  opts: ApplyStockOptions,
): Promise<StockChange[]> {
  const log = opts.logger ?? logger;
  const aggregated = new Map<string, StockDeductionLine & { quantity: Prisma.Decimal }>();
  for (const line of lines) {
    const key = `${line.productId}:${line.variantId ?? ''}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity = existing.quantity.plus(money(line.quantity));
    } else {
      aggregated.set(key, { ...line, quantity: money(line.quantity) });
    }
  }

  const changes: StockChange[] = [];
  const movements: Prisma.StockMovementCreateManyInput[] = [];

  for (const line of aggregated.values()) {
    if (line.quantity.lte(0)) continue;
    const qty = line.quantity.toString();
    const variantCond = line.variantId
      ? Prisma.sql`variant_id = ${line.variantId}::uuid`
      : Prisma.sql`variant_id IS NULL`;

    const updated =
      opts.direction === 'deduct'
        ? await tx.$queryRaw<Array<{ id: string; quantity: Prisma.Decimal }>>`
            UPDATE stock_levels
               SET quantity = quantity - ${qty}::numeric, updated_at = now()
             WHERE id = (
               SELECT id FROM stock_levels
                WHERE outlet_id = ${opts.outletId}::uuid
                  AND product_id = ${line.productId}::uuid
                  AND ${variantCond}
                LIMIT 1
                FOR UPDATE)
               AND quantity >= ${qty}::numeric
            RETURNING id, quantity`
        : await tx.$queryRaw<Array<{ id: string; quantity: Prisma.Decimal }>>`
            UPDATE stock_levels
               SET quantity = quantity + ${qty}::numeric, updated_at = now()
             WHERE id = (
               SELECT id FROM stock_levels
                WHERE outlet_id = ${opts.outletId}::uuid
                  AND product_id = ${line.productId}::uuid
                  AND ${variantCond}
                LIMIT 1
                FOR UPDATE)
            RETURNING id, quantity`;

    if (updated.length === 0) {
      const current = await tx.$queryRaw<Array<{ quantity: Prisma.Decimal }>>`
        SELECT quantity FROM stock_levels
         WHERE outlet_id = ${opts.outletId}::uuid
           AND product_id = ${line.productId}::uuid
           AND ${variantCond}
         LIMIT 1`;
      if (current.length > 0 && opts.direction === 'deduct') {
        throw new InsufficientStockException(
          line.productId,
          money(current[0].quantity).toNumber(),
          line.quantity.toNumber(),
        );
      }
      log.warn(
        `Stock level missing for product ${line.productId} (variant: ${line.variantId ?? 'none'}) at outlet ${opts.outletId}; stock not changed`,
      );
      continue;
    }

    const newQty = money(updated[0].quantity);
    const delta = opts.direction === 'deduct' ? line.quantity.negated() : line.quantity;
    changes.push({
      productId: line.productId,
      variantId: line.variantId,
      previousQty: newQty.minus(delta).toNumber(),
      newQty: newQty.toNumber(),
    });
    movements.push({
      outletId: opts.outletId,
      productId: line.productId,
      variantId: line.variantId,
      movementType: opts.movementType,
      quantity: delta,
      referenceId: opts.referenceId,
      referenceType: opts.referenceType,
      notes: line.note,
      createdBy: opts.employeeId,
    });
  }

  if (movements.length > 0) {
    await tx.stockMovement.createMany({ data: movements });
  }
  return changes;
}
