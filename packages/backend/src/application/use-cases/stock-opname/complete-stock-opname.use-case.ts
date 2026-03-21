import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';

export interface CompleteStockOpnameInput {
  opnameId: string;
  employeeId: string;
}

@Injectable()
export class CompleteStockOpnameUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: CompleteStockOpnameInput) {
    const opname = await this.prisma.stockOpname.findUnique({
      where: { id: input.opnameId },
      include: { items: true },
    });

    if (!opname) throw new NotFoundException('Stock opname not found');
    if (opname.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot complete opname with status "${opname.status}". Must be in_progress.`,
      );
    }

    // Check all items have been counted
    const uncounted = opname.items.filter((i) => i.actualQuantity === null);
    if (uncounted.length > 0) {
      throw new BadRequestException(`${uncounted.length} item(s) have not been counted yet`);
    }

    const stockEvents: {
      outletId: string;
      productId: string;
      variantId: string | null;
      prevQty: number;
      newQty: number;
    }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of opname.items) {
        const diff = item.difference?.toNumber() ?? 0;
        if (diff === 0) continue;

        const actualQty = item.actualQuantity!.toNumber();
        const systemQty = item.systemQuantity.toNumber();

        // Find and update stock level within the transaction
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            outletId: opname.outletId,
            productId: item.productId!,
            variantId: item.variantId ?? null,
          },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: actualQty },
          });
        }

        // Create stock movement for the adjustment
        await tx.stockMovement.create({
          data: {
            outletId: opname.outletId,
            productId: item.productId,
            variantId: item.variantId,
            movementType: 'opname',
            quantity: diff,
            referenceId: opname.id,
            referenceType: 'stock_opname',
            notes: item.notes || `Stock opname ${opname.opnameNumber}`,
            createdBy: input.employeeId,
          },
        });

        if (item.productId) {
          stockEvents.push({
            outletId: opname.outletId,
            productId: item.productId,
            variantId: item.variantId,
            prevQty: systemQty,
            newQty: actualQty,
          });
        }
      }

      // Mark opname as completed
      await tx.stockOpname.update({
        where: { id: input.opnameId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          approvedBy: input.employeeId,
        },
      });
    });

    // Publish stock change events
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

    return this.prisma.stockOpname.findUnique({
      where: { id: input.opnameId },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { name: true, sku: true } },
          },
        },
        createdByEmployee: { select: { name: true } },
        approvedByEmployee: { select: { name: true } },
      },
    });
  }
}
