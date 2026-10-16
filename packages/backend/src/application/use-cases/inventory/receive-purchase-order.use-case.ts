import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { money } from '@shared/utils/money';
import {
  CalculateMovingAverageCostUseCase,
  weightedAverageCost,
} from './calculate-moving-average-cost.use-case';

export interface ReceivePurchaseOrderInput {
  purchaseOrderId: string;
  /** Caller's business (from the JWT). The PO must belong to one of its outlets. */
  businessId: string;
  employeeId: string;
  /**
   * Optional per-line quantities. When omitted every line receives its full
   * remaining quantity. Lines not listed receive nothing in this call.
   */
  items?: { purchaseOrderItemId: string; quantityReceived: number }[];
}

export interface ReceivePurchaseOrderOutput {
  purchaseOrderId: string;
  status: 'received' | 'partial';
  itemsReceived: number;
  costUpdates: {
    productId: string | null;
    variantId: string | null;
    ingredientId?: string | null;
    previousCost: number;
    newCost: number;
  }[];
}

const RECEIVABLE_STATUSES = ['ordered', 'partial'] as const;

@Injectable()
export class ReceivePurchaseOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly calculateMovingAvgCost: CalculateMovingAverageCostUseCase,
  ) {}

  /**
   * Receives a purchase order atomically (R9):
   * 1. the status transition is a conditional update (`status IN (ordered, partial)`),
   *    which also row-locks the PO, so concurrent receives serialize and a second
   *    receive of a fully received PO is rejected with 409;
   * 2. stock is changed with atomic increments on the transaction client;
   * 3. moving-average cost, stock movements and per-line `quantityReceived` are
   *    written in the same transaction.
   */
  async execute(input: ReceivePurchaseOrderInput): Promise<ReceivePurchaseOrderOutput> {
    const costUpdates: ReceivePurchaseOrderOutput['costUpdates'] = [];
    const stockEvents: {
      outletId: string;
      productId: string;
      variantId: string | null;
      prevQty: number;
      newQty: number;
    }[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, outlet: { businessId: input.businessId } },
        select: { id: true, outletId: true, poNumber: true, status: true },
      });
      if (!po) throw new NotFoundException('Purchase order not found');

      // Conditional transition first: locks the row and rejects double receives.
      const claimed = await tx.purchaseOrder.updateMany({
        where: { id: po.id, status: { in: [...RECEIVABLE_STATUSES] } },
        data: { status: 'received', receivedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          `Cannot receive PO with status "${po.status}". Only ordered or partially received POs can be received.`,
        );
      }

      // Read lines only after the lock so quantities reflect earlier receipts.
      const lines = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id },
      });
      const lineById = new Map(lines.map((l) => [l.id, l]));

      const requested = new Map<string, Prisma.Decimal>();
      if (input.items) {
        for (const r of input.items) {
          if (!lineById.has(r.purchaseOrderItemId)) {
            throw new BadRequestException(
              `Item ${r.purchaseOrderItemId} does not belong to this purchase order`,
            );
          }
          requested.set(r.purchaseOrderItemId, money(r.quantityReceived));
        }
      }

      // Current stock for the event payload (one query, not per line).
      const productIds = [
        ...new Set(lines.map((l) => l.productId).filter((id): id is string => !!id)),
      ];
      const levels =
        productIds.length > 0
          ? await tx.stockLevel.findMany({
              where: { outletId: po.outletId, productId: { in: productIds } },
              select: { productId: true, variantId: true, quantity: true },
            })
          : [];
      const levelKey = (p: string, v: string | null) => `${p}:${v ?? ''}`;
      const levelQty = new Map(
        levels.map((l) => [levelKey(l.productId as string, l.variantId), money(l.quantity)]),
      );

      let received = 0;
      let touched = 0;
      let complete = true;

      for (const line of lines) {
        const remaining = Prisma.Decimal.max(
          money(line.quantityOrdered).minus(money(line.quantityReceived)),
          0,
        );
        const qty = input.items ? (requested.get(line.id) ?? money(0)) : remaining;

        if (qty.gt(remaining)) {
          throw new BadRequestException(
            `Received quantity for "${line.itemName}" exceeds the remaining ${remaining.toString()}`,
          );
        }
        if (qty.plus(money(line.quantityReceived)).lt(money(line.quantityOrdered))) {
          complete = false;
        }
        if (qty.lte(0)) continue;
        touched++;

        await tx.purchaseOrderItem.update({
          where: { id: line.id },
          data: { quantityReceived: { increment: qty } },
        });

        const unitCost = money(line.unitCost);

        if (line.productId) {
          const variantId = line.variantId ?? null;

          // Moving-average cost must read the stock BEFORE the increment.
          if (unitCost.gt(0)) {
            const cost = await this.calculateMovingAvgCost.execute(
              {
                productId: line.productId,
                variantId: variantId ?? undefined,
                outletId: po.outletId,
                newQuantity: qty.toNumber(),
                newUnitCost: unitCost.toNumber(),
                referenceId: po.id,
                referenceType: 'purchase_order',
                employeeId: input.employeeId,
              },
              tx,
            );
            costUpdates.push({
              productId: line.productId,
              variantId,
              previousCost: cost.previousCost,
              newCost: cost.newCost,
            });
          }

          // Atomic increment; variantId null is matched explicitly so a base-product
          // line never touches variant rows.
          const inc = await tx.stockLevel.updateMany({
            where: { outletId: po.outletId, productId: line.productId, variantId },
            data: { quantity: { increment: qty } },
          });
          if (inc.count === 0) {
            await tx.stockLevel.create({
              data: {
                outletId: po.outletId,
                productId: line.productId,
                variantId,
                quantity: qty,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              outletId: po.outletId,
              productId: line.productId,
              variantId,
              movementType: 'purchase',
              quantity: qty,
              referenceId: po.id,
              referenceType: 'purchase_order',
              notes: `PO ${po.poNumber} received`,
              createdBy: input.employeeId,
            },
          });

          const prev = levelQty.get(levelKey(line.productId, variantId)) ?? money(0);
          const next = prev.plus(qty);
          levelQty.set(levelKey(line.productId, variantId), next);
          stockEvents.push({
            outletId: po.outletId,
            productId: line.productId,
            variantId,
            prevQty: prev.toNumber(),
            newQty: next.toNumber(),
          });
          received++;
        } else if (line.ingredientId) {
          const cost = await this.receiveIngredient(tx, {
            outletId: po.outletId,
            ingredientId: line.ingredientId,
            quantity: qty,
            unitCost,
            poId: po.id,
            poNumber: po.poNumber,
            employeeId: input.employeeId,
          });
          if (cost) {
            costUpdates.push({
              productId: null,
              variantId: null,
              ingredientId: line.ingredientId,
              ...cost,
            });
          }
          received++;
        }
        // Free-text lines (no product/ingredient) only record quantityReceived.
      }

      if (touched === 0) {
        throw new BadRequestException('Nothing to receive: all quantities are zero');
      }

      const status: 'received' | 'partial' = complete ? 'received' : 'partial';
      if (status === 'partial') {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: 'partial', receivedAt: null },
        });
      }

      return { purchaseOrderId: po.id, status, itemsReceived: received };
    });

    // Publish events only after the transaction committed.
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

    return { ...result, costUpdates };
  }

  /** Ingredient line: atomic stock increment, movement and weighted cost per unit. */
  private async receiveIngredient(
    tx: Prisma.TransactionClient,
    args: {
      outletId: string;
      ingredientId: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      poId: string;
      poNumber: string;
      employeeId: string;
    },
  ): Promise<{ previousCost: number; newCost: number } | null> {
    let costResult: { previousCost: number; newCost: number } | null = null;

    if (args.unitCost.gt(0)) {
      await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${args.ingredientId}::uuid FOR UPDATE`;
      const ingredient = await tx.ingredient.findUnique({
        where: { id: args.ingredientId },
        select: { costPerUnit: true },
      });
      const agg = await tx.ingredientStockLevel.aggregate({
        where: { ingredientId: args.ingredientId },
        _sum: { quantity: true },
      });
      const previous = money(ingredient?.costPerUnit);
      const next = weightedAverageCost(
        money(agg._sum.quantity),
        previous,
        args.quantity,
        args.unitCost,
      );
      await tx.ingredient.update({
        where: { id: args.ingredientId },
        data: { costPerUnit: next },
      });
      costResult = { previousCost: previous.toNumber(), newCost: next.toNumber() };
    }

    await tx.ingredientStockLevel.upsert({
      where: {
        outletId_ingredientId: { outletId: args.outletId, ingredientId: args.ingredientId },
      },
      create: { outletId: args.outletId, ingredientId: args.ingredientId, quantity: args.quantity },
      update: { quantity: { increment: args.quantity } },
    });

    await tx.ingredientStockMovement.create({
      data: {
        outletId: args.outletId,
        ingredientId: args.ingredientId,
        movementType: 'purchase',
        quantity: args.quantity,
        referenceId: args.poId,
        referenceType: 'purchase_order',
        notes: `PO ${args.poNumber} received`,
        createdBy: args.employeeId,
      },
    });

    return costResult;
  }
}
