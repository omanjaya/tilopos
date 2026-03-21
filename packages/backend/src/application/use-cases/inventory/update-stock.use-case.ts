import { Injectable, BadRequestException } from '@nestjs/common';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CalculateMovingAverageCostUseCase } from './calculate-moving-average-cost.use-case';

export interface UpdateStockInput {
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

@Injectable()
export class UpdateStockUseCase {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly calculateMovingAvgCost: CalculateMovingAverageCostUseCase,
  ) {}

  async execute(input: UpdateStockInput): Promise<UpdateStockOutput> {
    if (input.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let stockLevel = await tx.stockLevel.findFirst({
        where: {
          outletId: input.outletId,
          productId: input.productId,
          variantId: input.variantId || null,
        },
      });

      if (!stockLevel) {
        stockLevel = await tx.stockLevel.create({
          data: {
            outletId: input.outletId,
            productId: input.productId,
            variantId: input.variantId || null,
            quantity: 0,
          },
        });
      }

      const previousQuantity = Number(stockLevel.quantity);
      let newQuantity: number;

      switch (input.adjustmentType) {
        case 'set':
          newQuantity = input.quantity;
          break;
        case 'increment':
          newQuantity = previousQuantity + input.quantity;
          break;
        case 'decrement':
          newQuantity = previousQuantity - input.quantity;
          break;
      }

      if (newQuantity < 0) {
        throw new InsufficientStockException(input.productId, previousQuantity, input.quantity);
      }

      // Calculate moving average cost when incrementing with a unitCost
      if (input.adjustmentType === 'increment' && input.unitCost != null && input.unitCost > 0) {
        await this.calculateMovingAvgCost.execute({
          productId: input.productId,
          variantId: input.variantId,
          outletId: input.outletId,
          existingQuantity: previousQuantity,
          newQuantity: input.quantity,
          newUnitCost: input.unitCost,
          referenceType: 'stock_adjustment',
          employeeId: input.employeeId,
        });
      }

      await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantity: newQuantity },
      });

      await tx.stockMovement.create({
        data: {
          outletId: input.outletId,
          productId: input.productId,
          variantId: input.variantId || null,
          movementType: 'adjustment',
          quantity: newQuantity - previousQuantity,
          referenceId: null,
          referenceType: 'stock_adjustment',
          notes: input.reason,
          createdBy: input.employeeId,
        },
      });

      return {
        stockLevelId: stockLevel.id,
        previousQuantity,
        newQuantity,
      };
    });

    this.eventBus.publish(
      new StockLevelChangedEvent(
        input.outletId,
        input.productId,
        input.variantId || null,
        result.previousQuantity,
        result.newQuantity,
      ),
    );

    return result;
  }
}
