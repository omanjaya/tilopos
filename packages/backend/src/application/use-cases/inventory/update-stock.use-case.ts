import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CalculateMovingAverageCostUseCase } from './calculate-moving-average-cost.use-case';

export interface UpdateStockInput {
  /** Caller's business (from the JWT). Product/variant must belong to it. */
  businessId: string;
  /** Must already be verified to belong to `businessId` (TenantAccessService.assertOutlet). */
  outletId: string;
  productId: string;
  variantId?: string;
  adjustmentType: 'set' | 'increment' | 'decrement';
  quantity: number;
  reason: string;
  employeeId: string;
  unitCost?: number;
}

export interface UpdateStockOutput {
  stockLevelId: string;
  previousQuantity: number;
  newQuantity: number;
}

/**
 * Manual stock adjustment (R9): the stock row is locked (SELECT ... FOR UPDATE) inside
 * the transaction, increments/decrements are applied atomically (decrement is
 * conditional on enough stock), and the movement + moving-average cost are written
 * with the same transaction client, so everything commits or rolls back together.
 */
@Injectable()
export class UpdateStockUseCase {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly calculateMovingAvgCost: CalculateMovingAverageCostUseCase,
  ) {}

  async execute(input: UpdateStockInput): Promise<UpdateStockOutput> {
    const isSet = input.adjustmentType === 'set';
    if (
      !Number.isFinite(input.quantity) ||
      input.quantity < 0 ||
      (!isSet && input.quantity === 0)
    ) {
      throw new BadRequestException(
        isSet ? 'Quantity must be 0 or greater' : 'Quantity must be greater than 0',
      );
    }

    await this.assertProductAndVariant(input);
    const variantId = input.variantId ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      // Make sure the row exists (ON CONFLICT DO NOTHING also covers the partial
      // unique index for variant_id IS NULL), then lock it.
      await tx.stockLevel.createMany({
        data: [{ outletId: input.outletId, productId: input.productId, variantId, quantity: 0 }],
        skipDuplicates: true,
      });
      const stockLevel = await tx.stockLevel.findFirst({
        where: { outletId: input.outletId, productId: input.productId, variantId },
        select: { id: true },
      });
      if (!stockLevel) throw new NotFoundException('Stock level not found');

      const locked = await tx.$queryRaw<Array<{ quantity: Prisma.Decimal }>>`
        SELECT quantity FROM stock_levels WHERE id = ${stockLevel.id}::uuid FOR UPDATE
      `;
      const previous = new Prisma.Decimal(locked[0]?.quantity ?? 0);
      const qty = new Prisma.Decimal(input.quantity);

      let delta: Prisma.Decimal;
      if (input.adjustmentType === 'increment') {
        // Moving-average cost must read the stock BEFORE the increment.
        if (input.unitCost != null && input.unitCost > 0) {
          await this.calculateMovingAvgCost.execute(
            {
              productId: input.productId,
              variantId: input.variantId,
              outletId: input.outletId,
              newQuantity: input.quantity,
              newUnitCost: input.unitCost,
              referenceType: 'stock_adjustment',
              employeeId: input.employeeId,
            },
            tx,
          );
        }
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: { increment: qty } },
        });
        delta = qty;
      } else if (input.adjustmentType === 'decrement') {
        const updated = await tx.stockLevel.updateMany({
          where: { id: stockLevel.id, quantity: { gte: qty } },
          data: { quantity: { decrement: qty } },
        });
        if (updated.count === 0) {
          throw new InsufficientStockException(
            input.productId,
            previous.toNumber(),
            input.quantity,
          );
        }
        delta = qty.negated();
      } else {
        // 'set' is an absolute count by definition; the row is locked, so the
        // recorded delta is exact.
        await tx.stockLevel.update({ where: { id: stockLevel.id }, data: { quantity: qty } });
        delta = qty.minus(previous);
      }

      await tx.stockMovement.create({
        data: {
          outletId: input.outletId,
          productId: input.productId,
          variantId,
          movementType: 'adjustment',
          quantity: delta,
          referenceId: null,
          referenceType: 'stock_adjustment',
          notes: input.reason,
          createdBy: input.employeeId,
        },
      });

      return {
        stockLevelId: stockLevel.id,
        previousQuantity: previous.toNumber(),
        newQuantity: previous.plus(delta).toNumber(),
      };
    });

    this.eventBus.publish(
      new StockLevelChangedEvent(
        input.outletId,
        input.productId,
        variantId,
        result.previousQuantity,
        result.newQuantity,
      ),
    );

    return result;
  }

  /** Product must belong to the business; a variant must belong to that product (R3). */
  private async assertProductAndVariant(input: UpdateStockInput): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: input.productId, businessId: input.businessId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (input.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: input.variantId, productId: input.productId },
        select: { id: true },
      });
      if (!variant) throw new NotFoundException('Variant not found for this product');
    }
  }
}
