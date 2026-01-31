import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';

export interface UpdateStockInput {
  outletId: string;
  productId: string;
  variantId?: string;
  adjustmentType: 'set' | 'increment' | 'decrement';
  quantity: number;
  reason: string;
  employeeId: string;
}

export interface UpdateStockOutput {
  stockLevelId: string;
  previousQuantity: number;
  newQuantity: number;
}

@Injectable()
export class UpdateStockUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateStockInput): Promise<UpdateStockOutput> {
    let stockLevel = await this.inventoryRepo.findStockLevel(
      input.outletId,
      input.productId,
      input.variantId || null,
    );

    if (!stockLevel) {
      const created = await this.prisma.stockLevel.create({
        data: {
          outletId: input.outletId,
          productId: input.productId,
          variantId: input.variantId || null,
          quantity: 0,
        },
      });
      stockLevel = {
        id: created.id,
        outletId: created.outletId,
        productId: created.productId,
        variantId: created.variantId,
        quantity: 0,
        lowStockAlert: created.lowStockAlert,
        updatedAt: created.updatedAt,
      };
    }

    const previousQuantity = stockLevel.quantity;
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

    await this.inventoryRepo.updateStockLevel(stockLevel.id, newQuantity);

    await this.inventoryRepo.createStockMovement({
      id: '',
      outletId: input.outletId,
      productId: input.productId,
      variantId: input.variantId || null,
      movementType: 'adjustment',
      quantity: newQuantity - previousQuantity,
      referenceId: null,
      referenceType: 'stock_adjustment',
      notes: input.reason,
      createdBy: input.employeeId,
      createdAt: new Date(),
    });

    this.eventBus.publish(
      new StockLevelChangedEvent(
        input.outletId,
        input.productId,
        input.variantId || null,
        previousQuantity,
        newQuantity,
      ),
    );

    return {
      stockLevelId: stockLevel.id,
      previousQuantity,
      newQuantity,
    };
  }
}
