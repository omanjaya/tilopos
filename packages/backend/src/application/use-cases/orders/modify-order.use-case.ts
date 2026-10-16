import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  assertValidQuantity,
  resolveOrderItems,
  type OrderItemRequest,
} from './order-items.helper';

export type ModifyOrderItemInput = OrderItemRequest;

export interface ModifyOrderInput {
  orderId: string;
  businessId: string;
  employeeId: string;
  addItems?: ModifyOrderItemInput[];
  removeItemIds?: string[];
  updateItems?: Array<{ itemId: string; quantity?: number; notes?: string }>;
  notes?: string;
  priority?: number;
}

export interface ModifyOrderOutput {
  orderId: string;
  itemsAdded: number;
  itemsRemoved: number;
  itemsUpdated: number;
}

export const MODIFIABLE_ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed'];
const MAX_PRIORITY = 10;

/**
 * The single order-modification implementation (PUT /orders/:id and PUT /orders/:id/items).
 * All writes happen in one transaction that first locks the order row with a
 * conditional update, so the kitchen cannot start the order mid-modification.
 */
@Injectable()
export class ModifyOrderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ModifyOrderInput): Promise<ModifyOrderOutput> {
    for (const update of input.updateItems ?? []) {
      if (update.quantity !== undefined) assertValidQuantity(update.quantity);
    }
    if (
      input.priority !== undefined &&
      (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > MAX_PRIORITY)
    ) {
      throw new BadRequestException(`Priority must be an integer between 0 and ${MAX_PRIORITY}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: input.orderId, outlet: { businessId: input.businessId } },
        select: { id: true, status: true },
      });
      if (!order) {
        throw new NotFoundException(`Order ${input.orderId} not found`);
      }
      if (!MODIFIABLE_ORDER_STATUSES.includes(order.status)) {
        throw new ConflictException(`Cannot modify order in status: ${order.status}`);
      }

      // Conditional touch: locks the row for this transaction and fails if the
      // status moved on since we read it.
      const orderData: Prisma.OrderUpdateManyMutationInput = { updatedAt: new Date() };
      if (input.notes !== undefined) orderData.notes = input.notes;
      if (input.priority !== undefined) orderData.priority = input.priority;
      const locked = await tx.order.updateMany({
        where: { id: order.id, status: { in: MODIFIABLE_ORDER_STATUSES } },
        data: orderData,
      });
      if (locked.count !== 1) {
        throw new ConflictException('Order status changed concurrently, please retry');
      }

      let itemsAdded = 0;
      if (input.addItems && input.addItems.length > 0) {
        const items = await resolveOrderItems(tx, input.businessId, input.addItems);
        const created = await tx.orderItem.createMany({
          data: items.map((item) => ({ ...item, orderId: order.id, status: 'pending' as const })),
        });
        itemsAdded = created.count;
      }

      let itemsRemoved = 0;
      if (input.removeItemIds && input.removeItemIds.length > 0) {
        const deleted = await tx.orderItem.deleteMany({
          where: { id: { in: input.removeItemIds }, orderId: order.id, status: 'pending' },
        });
        itemsRemoved = deleted.count;
      }

      let itemsUpdated = 0;
      for (const update of input.updateItems ?? []) {
        const data: Prisma.OrderItemUpdateManyMutationInput = {};
        if (update.quantity !== undefined) data.quantity = update.quantity;
        if (update.notes !== undefined) data.notes = update.notes;
        if (Object.keys(data).length === 0) continue;
        const res = await tx.orderItem.updateMany({
          where: { id: update.itemId, orderId: order.id, status: 'pending' },
          data,
        });
        itemsUpdated += res.count;
      }

      return { orderId: order.id, itemsAdded, itemsRemoved, itemsUpdated };
    });
  }
}
