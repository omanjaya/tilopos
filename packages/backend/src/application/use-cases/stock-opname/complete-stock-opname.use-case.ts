import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { OPNAME_DETAIL_INCLUDE, throwOpnameTransitionError } from './opname-common';

export interface CompleteStockOpnameInput {
  opnameId: string;
  businessId: string;
  employeeId: string;
}

interface StockChange {
  outletId: string;
  productId: string;
  variantId: string | null;
  prevQty: number;
  newQty: number;
}

/**
 * Completes an opname (R9):
 * 1. conditional status transition in_progress -> completed is the FIRST statement in the
 *    transaction, so a second (concurrent) completion matches no row and gets 409;
 * 2. the counted difference (actual - snapshot) is applied as an atomic increment, so
 *    sales/receipts recorded between the snapshot and completion are preserved;
 * 3. missing stock rows are created, movements are inserted in one statement, and events
 *    are published only after commit.
 */
@Injectable()
export class CompleteStockOpnameUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: CompleteStockOpnameInput) {
    const { changes, opname } = await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.stockOpname.updateMany({
        where: {
          id: input.opnameId,
          outlet: { businessId: input.businessId },
          status: 'in_progress',
        },
        data: { status: 'completed', completedAt: new Date(), approvedBy: input.employeeId },
      });
      if (transitioned.count === 0) {
        await throwOpnameTransitionError(tx, input.opnameId, input.businessId, 'complete');
      }

      const header = await tx.stockOpname.findUniqueOrThrow({
        where: { id: input.opnameId },
        select: { id: true, outletId: true, opnameNumber: true },
      });
      const items = await tx.stockOpnameItem.findMany({ where: { opnameId: header.id } });

      const uncounted = items.filter((i) => i.actualQuantity === null).length;
      if (uncounted > 0) {
        // Throwing rolls back the status transition above.
        throw new BadRequestException(`${uncounted} item(s) have not been counted yet`);
      }

      const adjusted = items
        .map((item) => ({
          item,
          diff: item.actualQuantity!.minus(item.systemQuantity),
        }))
        .filter(({ item, diff }) => item.productId && !diff.isZero());

      if (adjusted.length > 0) {
        // Rows that disappeared since the snapshot are recreated at 0 before incrementing
        // (ON CONFLICT DO NOTHING also covers the partial unique index for NULL variants).
        await tx.stockLevel.createMany({
          data: adjusted.map(({ item }) => ({
            outletId: header.outletId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: 0,
          })),
          skipDuplicates: true,
        });

        for (const { item, diff } of adjusted) {
          await tx.stockLevel.updateMany({
            where: {
              outletId: header.outletId,
              productId: item.productId!,
              variantId: item.variantId ?? null,
            },
            data: { quantity: { increment: diff } },
          });
        }

        await tx.stockMovement.createMany({
          data: adjusted.map(({ item, diff }) => ({
            outletId: header.outletId,
            productId: item.productId,
            variantId: item.variantId,
            movementType: 'opname' as const,
            quantity: diff,
            referenceId: header.id,
            referenceType: 'stock_opname',
            notes: item.notes || `Stock opname ${header.opnameNumber}`,
            createdBy: input.employeeId,
          })),
        });
      }

      // Resulting quantities for the change events (one query).
      const productIds = [...new Set(adjusted.map(({ item }) => item.productId!))];
      const levels = productIds.length
        ? await tx.stockLevel.findMany({
            where: { outletId: header.outletId, productId: { in: productIds } },
            select: { productId: true, variantId: true, quantity: true },
          })
        : [];
      const levelKey = (p: string | null, v: string | null) => `${p}:${v ?? ''}`;
      const current = new Map(levels.map((l) => [levelKey(l.productId, l.variantId), l.quantity]));

      const stockChanges: StockChange[] = adjusted.map(({ item, diff }) => {
        const now = current.get(levelKey(item.productId, item.variantId)) ?? new Prisma.Decimal(0);
        return {
          outletId: header.outletId,
          productId: item.productId!,
          variantId: item.variantId,
          prevQty: now.minus(diff).toNumber(),
          newQty: now.toNumber(),
        };
      });

      const detail = await tx.stockOpname.findUnique({
        where: { id: header.id },
        include: OPNAME_DETAIL_INCLUDE,
      });
      return { changes: stockChanges, opname: detail };
    });

    for (const evt of changes) {
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

    return opname;
  }
}
