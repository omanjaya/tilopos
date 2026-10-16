import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';

export type OrderStatusTarget = 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed';

export interface UpdateOrderStatusInput {
  orderId: string;
  businessId: string;
  status: OrderStatusTarget;
  employeeId: string;
}

export interface UpdateOrderStatusOutput {
  orderId: string;
  previousStatus: string;
  newStatus: string;
}

/**
 * Allowed kitchen/front-of-house transitions. Cancelling is deliberately not
 * here: it goes through CancelOrderUseCase, which also cancels items and frees
 * the table.
 */
export const VALID_ORDER_TRANSITIONS: Record<string, OrderStatusTarget[]> = {
  pending: ['confirmed', 'preparing'],
  confirmed: ['preparing'],
  preparing: ['ready'],
  ready: ['served', 'completed'],
  served: ['completed'],
};

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: UpdateOrderStatusInput): Promise<UpdateOrderStatusOutput> {
    const { outletId, previousStatus } = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, outlet: { businessId: input.businessId } },
        select: { id: true, status: true, outletId: true, tableId: true },
      });
      if (!order) {
        throw new NotFoundException(`Order ${input.orderId} not found`);
      }

      const allowed = VALID_ORDER_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new ConflictException(`Cannot transition from ${order.status} to ${input.status}`);
      }

      const data: Prisma.OrderUpdateManyMutationInput = { status: input.status as OrderStatus };
      if (input.status === 'preparing') data.startedAt = new Date();
      if (input.status === 'completed') data.completedAt = new Date();

      // Conditional on the status we validated: a concurrent change makes this a no-op.
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data,
      });
      if (updated.count !== 1) {
        throw new ConflictException('Order status changed concurrently, please retry');
      }

      if (input.status === 'completed' && order.tableId) {
        await tx.table.updateMany({
          where: { id: order.tableId, currentOrderId: order.id },
          data: { status: 'available', currentOrderId: null, occupiedAt: null },
        });
      }

      return { outletId: order.outletId, previousStatus: order.status };
    });

    this.eventBus.publish(
      new OrderStatusChangedEvent(input.orderId, outletId, previousStatus, input.status),
    );

    return { orderId: input.orderId, previousStatus, newStatus: input.status };
  }
}
