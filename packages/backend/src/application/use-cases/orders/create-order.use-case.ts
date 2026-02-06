import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { IOrderRepository } from '@domain/interfaces/repositories/order.repository';

export interface OrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  station?: string;
  notes?: string;
}

export interface CreateOrderInput {
  outletId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  customerId?: string;
  items: OrderItemInput[];
  priority?: number;
  notes?: string;
}

export interface CreateOrderOutput {
  orderId: string;
  orderNumber: string;
  estimatedTime: number | null;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.ORDER)
    private readonly orderRepo: IOrderRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const products = await this.prisma.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, isActive: true },
    });

    const order = await this.orderRepo.save({
      id: crypto.randomUUID(),
      outletId: input.outletId,
      orderNumber,
      orderType: input.orderType,
      tableId: input.tableId || null,
      customerId: input.customerId || null,
      status: 'pending',
      priority: input.priority ?? 0,
      notes: input.notes || null,
      estimatedTime: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId || null,
          productName: product?.name || 'Unknown',
          quantity: item.quantity,
          station: item.station || null,
          notes: item.notes || null,
          status: 'pending',
        },
      });
    }

    if (input.tableId) {
      await this.prisma.table.update({
        where: { id: input.tableId },
        data: { status: 'occupied', currentOrderId: order.id, occupiedAt: new Date() },
      });
    }

    this.eventBus.publish(new OrderStatusChangedEvent(order.id, input.outletId, '', 'pending'));

    return {
      orderId: order.id,
      orderNumber,
      estimatedTime: null,
    };
  }
}
