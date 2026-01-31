import { Injectable } from '@nestjs/common';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface BumpOrderInput {
  orderItemId: string;
  employeeId: string;
  station: string;
}

export interface BumpOrderOutput {
  orderItemId: string;
  orderId: string;
  status: string;
  allItemsCompleted: boolean;
}

@Injectable()
export class BumpOrderUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: BumpOrderInput): Promise<BumpOrderOutput> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: { order: true },
    });

    if (!orderItem) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, `Order item ${input.orderItemId} not found`);
    }

    await this.prisma.orderItem.update({
      where: { id: input.orderItemId },
      data: { status: 'ready', completedAt: new Date() },
    });

    const allItems = await this.prisma.orderItem.findMany({
      where: { orderId: orderItem.orderId },
    });

    const allCompleted = allItems.every(
      item => item.id === input.orderItemId || item.status === 'ready' || item.status === 'served',
    );

    if (allCompleted) {
      await this.prisma.order.update({
        where: { id: orderItem.orderId },
        data: { status: 'ready' },
      });

      this.eventBus.publish(
        new OrderStatusChangedEvent(
          orderItem.orderId,
          orderItem.order.outletId,
          orderItem.order.status,
          'ready',
        ),
      );
    }

    return {
      orderItemId: input.orderItemId,
      orderId: orderItem.orderId,
      status: 'ready',
      allItemsCompleted: allCompleted,
    };
  }
}
