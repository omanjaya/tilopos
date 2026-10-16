import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface CancelOrderInput {
  orderId: string;
  businessId: string;
  employeeId: string;
  reason: string;
}

export interface CancelOrderOutput {
  orderId: string;
  previousStatus: string;
  cancelledAt: Date;
  reason: string;
  /** Items that were already being prepared or ready when the order was cancelled. */
  wastedItems: Array<{ itemId: string; productName: string; quantity: number; status: string }>;
}

export const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
];

/**
 * The single cancel implementation (PUT /orders/:id/cancel and DELETE /orders/:id).
 * Order, items and table are updated in one transaction; the status change is a
 * conditional update so a concurrent status change or double cancel cannot slip in.
 */
@Injectable()
export class CancelOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: CancelOrderInput): Promise<CancelOrderOutput> {
    const reason = (input.reason ?? '').trim();
    if (!reason) {
      throw new BadRequestException('A cancellation reason is required');
    }

    const cancelledAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, outlet: { businessId: input.businessId } },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException(`Order ${input.orderId} not found`);
      }
      if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
        throw new ConflictException(`Cannot cancel order in status: ${order.status}`);
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: 'cancelled',
          notes: order.notes ? `${order.notes}\n[CANCELLED] ${reason}` : `[CANCELLED] ${reason}`,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Order status changed concurrently, please retry');
      }

      await tx.orderItem.updateMany({
        where: { orderId: order.id, status: { notIn: ['served', 'cancelled'] } },
        data: { status: 'cancelled' },
      });

      if (order.tableId) {
        // Only free the table if it is still held by this order.
        await tx.table.updateMany({
          where: { id: order.tableId, currentOrderId: order.id },
          data: { status: 'available', currentOrderId: null, occupiedAt: null },
        });
      }

      return {
        outletId: order.outletId,
        previousStatus: order.status,
        wastedItems: order.items
          .filter((item) => item.status === 'preparing' || item.status === 'ready')
          .map((item) => ({
            itemId: item.id,
            productName: item.productName,
            quantity: item.quantity,
            status: item.status,
          })),
      };
    });

    this.eventBus.publish(
      new OrderStatusChangedEvent(
        input.orderId,
        result.outletId,
        result.previousStatus,
        'cancelled',
      ),
    );

    return {
      orderId: input.orderId,
      previousStatus: result.previousStatus,
      cancelledAt,
      reason,
      wastedItems: result.wastedItems,
    };
  }
}
