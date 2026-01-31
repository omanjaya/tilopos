import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { OrderPriorityLevel } from '../../application/dtos/order-priority.dto';

const PRIORITY_MAP: Record<OrderPriorityLevel, number> = {
  normal: 0,
  urgent: 5,
  vip: 10,
};

export interface SetPriorityResult {
  orderId: string;
  priority: OrderPriorityLevel;
  numericPriority: number;
}

export interface ModifyItemsInput {
  addItems?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    station?: string;
    notes?: string;
  }>;
  removeItemIds?: string[];
  updateItems?: Array<{
    itemId: string;
    quantity?: number;
    notes?: string;
  }>;
}

export interface ModifyItemsResult {
  orderId: string;
  itemsAdded: number;
  itemsRemoved: number;
  itemsUpdated: number;
}

export interface CancelOrderResult {
  orderId: string;
  previousStatus: string;
  cancelledAt: Date;
  reason: string;
  wastedItems: Array<{
    itemId: string;
    productName: string;
    quantity: number;
    status: string;
  }>;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async modifyItems(
    orderId: string,
    _employeeId: string,
    input: ModifyItemsInput,
  ): Promise<ModifyItemsResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const modifiableStatuses = ['pending', 'confirmed'];
    if (!modifiableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot modify order in status: ${order.status}`,
      );
    }

    let itemsAdded = 0;
    let itemsRemoved = 0;
    let itemsUpdated = 0;

    // Add new items
    if (input.addItems && input.addItems.length > 0) {
      const productIds = input.addItems.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      for (const item of input.addItems) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        await this.prisma.orderItem.create({
          data: {
            orderId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            productName: product.name,
            quantity: item.quantity,
            station: item.station ?? null,
            notes: item.notes ?? null,
            status: 'pending',
          },
        });
        itemsAdded++;
      }
    }

    // Remove items (only pending items can be removed)
    if (input.removeItemIds && input.removeItemIds.length > 0) {
      const deleteResult = await this.prisma.orderItem.deleteMany({
        where: {
          id: { in: input.removeItemIds },
          orderId,
          status: 'pending',
        },
      });
      itemsRemoved = deleteResult.count;
    }

    // Update existing items
    if (input.updateItems && input.updateItems.length > 0) {
      for (const update of input.updateItems) {
        const updateData: Record<string, unknown> = {};
        if (update.quantity !== undefined) updateData.quantity = update.quantity;
        if (update.notes !== undefined) updateData.notes = update.notes;

        if (Object.keys(updateData).length > 0) {
          await this.prisma.orderItem.updateMany({
            where: { id: update.itemId, orderId },
            data: updateData,
          });
          itemsUpdated++;
        }
      }
    }

    return {
      orderId,
      itemsAdded,
      itemsRemoved,
      itemsUpdated,
    };
  }

  async cancel(
    orderId: string,
    _employeeId: string,
    reason: string,
  ): Promise<CancelOrderResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const cancellableStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in status: ${order.status}`,
      );
    }

    const previousStatus = order.status;
    const cancelledAt = new Date();

    // Identify items that were already being prepared or ready (wasted items)
    const wastedItems = order.items
      .filter((item) => item.status === 'preparing' || item.status === 'ready')
      .map((item) => ({
        itemId: item.id,
        productName: item.productName,
        quantity: item.quantity,
        status: item.status,
      }));

    // Update order status and append cancellation reason
    const updatedNotes = order.notes
      ? `${order.notes}\n[CANCELLED] ${reason}`
      : `[CANCELLED] ${reason}`;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        notes: updatedNotes,
      },
    });

    // Cancel all non-served, non-cancelled items
    await this.prisma.orderItem.updateMany({
      where: {
        orderId,
        status: { notIn: ['served', 'cancelled'] },
      },
      data: { status: 'cancelled' },
    });

    // Free up the table if one was assigned
    if (order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: {
          status: 'available',
          currentOrderId: null,
          occupiedAt: null,
        },
      });
    }

    return {
      orderId,
      previousStatus,
      cancelledAt,
      reason,
      wastedItems,
    };
  }

  async setPriority(
    orderId: string,
    priority: OrderPriorityLevel,
  ): Promise<SetPriorityResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const activeStatuses = ['pending', 'confirmed', 'preparing'];
    if (!activeStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot change priority for order in status: ${order.status}`,
      );
    }

    const numericPriority = PRIORITY_MAP[priority];

    await this.prisma.order.update({
      where: { id: orderId },
      data: { priority: numericPriority },
    });

    return {
      orderId,
      priority,
      numericPriority,
    };
  }
}
