import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import { CalculateMovingAverageCostUseCase } from './calculate-moving-average-cost.use-case';

export interface ReceivePurchaseOrderInput {
  purchaseOrderId: string;
  employeeId: string;
}

export interface ReceivePurchaseOrderOutput {
  purchaseOrderId: string;
  itemsReceived: number;
  costUpdates: {
    productId: string | null;
    variantId: string | null;
    previousCost: number;
    newCost: number;
  }[];
}

@Injectable()
export class ReceivePurchaseOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    private readonly calculateMovingAvgCost: CalculateMovingAverageCostUseCase,
  ) {}

  async execute(input: ReceivePurchaseOrderInput): Promise<ReceivePurchaseOrderOutput> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'ordered') {
      throw new BadRequestException(
        `Cannot receive PO with status "${po.status}". Only ordered POs can be received.`,
      );
    }

    const costUpdates: ReceivePurchaseOrderOutput['costUpdates'] = [];
    const stockEvents: {
      outletId: string;
      productId: string;
      variantId: string | null;
      prevQty: number;
      newQty: number;
    }[] = [];

    await this.prisma.$transaction(async (tx) => {
      // Update PO status
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'received', receivedAt: new Date() },
      });

      for (const item of po.items) {
        const productId = item.productId;
        const variantId = item.variantId;

        // Skip items without product reference (ingredient-only items)
        if (!productId && !variantId) continue;

        const receivedQty = item.quantityReceived?.toNumber() || item.quantityOrdered.toNumber();
        const unitCost = item.unitCost.toNumber();

        // Find or create stock level
        let stockLevel = await this.inventoryRepo.findStockLevel(
          po.outletId,
          productId!,
          variantId,
        );

        if (!stockLevel) {
          const created = await tx.stockLevel.create({
            data: {
              outletId: po.outletId,
              productId: productId,
              variantId: variantId,
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

        const prevQty = stockLevel.quantity;

        // Calculate moving average cost
        if (unitCost > 0) {
          const costResult = await this.calculateMovingAvgCost.execute({
            productId: productId || undefined,
            variantId: variantId || undefined,
            outletId: po.outletId,
            existingQuantity: prevQty,
            newQuantity: receivedQty,
            newUnitCost: unitCost,
            referenceId: po.id,
            referenceType: 'purchase_order',
            employeeId: input.employeeId,
          });

          costUpdates.push({
            productId,
            variantId,
            previousCost: costResult.previousCost,
            newCost: costResult.newCost,
          });
        }

        // Update stock level
        const newQty = prevQty + receivedQty;
        await this.inventoryRepo.updateStockLevel(stockLevel.id, newQty);

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            outletId: po.outletId,
            productId: productId,
            variantId: variantId,
            movementType: 'purchase',
            quantity: receivedQty,
            referenceId: po.id,
            referenceType: 'purchase_order',
            notes: `PO ${po.poNumber} received`,
            createdBy: input.employeeId,
          },
        });

        stockEvents.push({
          outletId: po.outletId,
          productId: productId!,
          variantId,
          prevQty,
          newQty,
        });
      }
    });

    // Publish events outside transaction
    for (const evt of stockEvents) {
      this.eventBus.publish(
        new StockLevelChangedEvent(
          evt.outletId,
          evt.productId,
          evt.variantId,
          evt.prevQty,
          evt.newQty,
        ),
      );
    }

    return {
      purchaseOrderId: po.id,
      itemsReceived: stockEvents.length,
      costUpdates,
    };
  }
}
