import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderItemStatus, OrderStatus } from '@prisma/client';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface BumpOrderInput {
  orderItemId: string;
  businessId: string;
  employeeId: string;
  /** Ignored; kept for request compatibility. */
  station?: string;
}

export interface BumpOrderOutput {
  orderItemId: string;
  orderId: string;
  status: string;
  allItemsCompleted: boolean;
}

/** Orders the kitchen is still working on. */
export const KITCHEN_ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing'];
const BUMPABLE_ITEM_STATUSES: OrderItemStatus[] = ['pending', 'preparing'];
/** Items that no longer block the order from being ready. */
const DONE_ITEM_STATUSES: OrderItemStatus[] = ['ready', 'served', 'cancelled'];

/**
 * Marks one kitchen item ready; when every remaining item is done the order
 * becomes 'ready'. Used by POST /kds/bump and PUT /kds/items/:id/ready.
 */
@Injectable()
export class BumpOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: BumpOrderInput): Promise<BumpOrderOutput> {
    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: { id: input.orderItemId, order: { outlet: { businessId: input.businessId } } },
        select: { id: true, status: true, orderId: true },
      });
      if (!item) {
        throw new NotFoundException(`Order item ${input.orderItemId} not found`);
      }

      const order = await tx.order.findFirst({
        where: { id: item.orderId },
        select: { id: true, status: true, outletId: true },
      });
      if (!order || !KITCHEN_ACTIVE_ORDER_STATUSES.includes(order.status)) {
        throw new ConflictException(`Order is ${order?.status ?? 'missing'} and cannot be bumped`);
      }

      // Lock the order row: concurrent bumps of the same order are serialised here,
      // so the "all items done" check below always sees the other bump's result.
      const locked = await tx.order.updateMany({
        where: { id: order.id, status: { in: KITCHEN_ACTIVE_ORDER_STATUSES } },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) {
        throw new ConflictException('Order status changed concurrently, please retry');
      }

      const bumped = await tx.orderItem.updateMany({
        where: { id: item.id, status: { in: BUMPABLE_ITEM_STATUSES } },
        data: { status: 'ready', completedAt: new Date() },
      });
      if (bumped.count !== 1) {
        throw new ConflictException(`Item is ${item.status} and cannot be bumped`);
      }

      const remaining = await tx.orderItem.count({
        where: { orderId: order.id, status: { notIn: DONE_ITEM_STATUSES } },
      });
      const nonCancelled = await tx.orderItem.count({
        where: { orderId: order.id, status: { not: 'cancelled' } },
      });
      const allDone = remaining === 0 && nonCancelled > 0;

      if (allDone) {
        await tx.order.updateMany({
          where: { id: order.id, status: { in: KITCHEN_ACTIVE_ORDER_STATUSES } },
          data: { status: 'ready' },
        });
      }

      return { orderId: order.id, outletId: order.outletId, previous: order.status, allDone };
    });

    if (result.allDone) {
      this.eventBus.publish(
        new OrderStatusChangedEvent(result.orderId, result.outletId, result.previous, 'ready'),
      );
    }

    return {
      orderItemId: input.orderItemId,
      orderId: result.orderId,
      status: 'ready',
      allItemsCompleted: result.allDone,
    };
  }
}
