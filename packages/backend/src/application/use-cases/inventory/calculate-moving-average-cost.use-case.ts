import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { money } from '@shared/utils/money';

export interface CalculateMovingAverageCostInput {
  productId?: string;
  variantId?: string;
  outletId: string;
  /**
   * @deprecated Ignored. The cost price is business-wide, so the weighted average
   * uses the product/variant stock across ALL outlets, read from the database
   * (F0667). Call this BEFORE applying the incoming stock increment.
   */
  existingQuantity?: number;
  newQuantity: number;
  newUnitCost: number;
  referenceId?: string;
  referenceType?: string;
  employeeId?: string;
}

export interface CalculateMovingAverageCostOutput {
  previousCost: number;
  newCost: number;
  costPriceHistoryId: string;
}

type Db = Prisma.TransactionClient | PrismaService;

const ZERO = new Prisma.Decimal(0);

/**
 * Weighted moving-average cost:
 *   newCost = (Q * oldCost + q * unitCost) / (Q + q), rounded to 4 dp,
 * where Q is the business-wide on-hand quantity before the receipt (negative
 * stock counts as 0) and q the received quantity. Pure Decimal arithmetic (R8).
 */
export function weightedAverageCost(
  existingQuantity: Prisma.Decimal.Value,
  previousCost: Prisma.Decimal.Value,
  newQuantity: Prisma.Decimal.Value,
  newUnitCost: Prisma.Decimal.Value,
): Prisma.Decimal {
  const qBefore = Prisma.Decimal.max(new Prisma.Decimal(existingQuantity), ZERO);
  const qIn = new Prisma.Decimal(newQuantity);
  const oldCost = new Prisma.Decimal(previousCost);
  const unitCost = new Prisma.Decimal(newUnitCost);
  const total = qBefore.plus(qIn);

  if (total.lte(0)) return oldCost.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
  if (qBefore.isZero() || oldCost.isZero()) {
    return unitCost.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
  }
  return qBefore
    .times(oldCost)
    .plus(qIn.times(unitCost))
    .dividedBy(total)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

@Injectable()
export class CalculateMovingAverageCostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass the caller's transaction client (`tx`) so the cost update and history
   * row commit or roll back together with the stock change (R9). With `tx`, the
   * product/variant row is locked (SELECT ... FOR UPDATE) before the cost is read,
   * so concurrent receipts serialize instead of averaging from a stale cost.
   * Callers must have verified the product/variant belongs to the caller's business.
   */
  async execute(
    input: CalculateMovingAverageCostInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CalculateMovingAverageCostOutput> {
    const db: Db = tx ?? this.prisma;
    const { productId, variantId } = input;
    if (!productId && !variantId) {
      throw new Error('CalculateMovingAverageCostUseCase: productId or variantId is required');
    }

    let previousCost: Prisma.Decimal;
    let existingQuantity: Prisma.Decimal;

    if (variantId) {
      if (tx) {
        await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${variantId}::uuid FOR UPDATE`;
      }
      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        select: { costPrice: true },
      });
      previousCost = money(variant?.costPrice);
      const agg = await db.stockLevel.aggregate({
        where: { variantId },
        _sum: { quantity: true },
      });
      existingQuantity = money(agg._sum.quantity);
    } else {
      const pid = productId as string;
      if (tx) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${pid}::uuid FOR UPDATE`;
      }
      const product = await db.product.findUnique({
        where: { id: pid },
        select: { costPrice: true },
      });
      previousCost = money(product?.costPrice);
      const agg = await db.stockLevel.aggregate({
        where: { productId: pid, variantId: null },
        _sum: { quantity: true },
      });
      existingQuantity = money(agg._sum.quantity);
    }

    const newCost = weightedAverageCost(
      existingQuantity,
      previousCost,
      input.newQuantity,
      input.newUnitCost,
    );

    if (variantId) {
      await db.productVariant.update({
        where: { id: variantId },
        data: { costPrice: newCost },
      });
    } else {
      await db.product.update({
        where: { id: productId as string },
        data: { costPrice: newCost },
      });
    }

    const history = await db.costPriceHistory.create({
      data: {
        productId: productId || null,
        variantId: variantId || null,
        previousCost,
        newCost,
        quantityBefore: existingQuantity,
        quantityAdded: new Prisma.Decimal(input.newQuantity),
        unitCostAdded: new Prisma.Decimal(input.newUnitCost),
        referenceId: input.referenceId || null,
        referenceType: input.referenceType || null,
        createdBy: input.employeeId || null,
      },
    });

    return {
      previousCost: previousCost.toNumber(),
      newCost: newCost.toNumber(),
      costPriceHistoryId: history.id,
    };
  }
}
