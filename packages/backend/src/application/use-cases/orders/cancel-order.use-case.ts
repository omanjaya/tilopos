import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IOrderRepository } from '@domain/interfaces/repositories/order.repository';

export interface CancelOrderInput {
  orderId: string;
  employeeId: string;
  reason: string;
}

export interface CancelOrderOutput {
  orderId: string;
  previousStatus: string;
  cancelledAt: Date;
  reason: string;
}

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.ORDER)
    private readonly orderRepo: IOrderRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: CancelOrderInput): Promise<CancelOrderOutput> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, `Order ${input.orderId} not found`);
    }

    const cancellableStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new AppError(
        ErrorCode.ORDER_NOT_FOUND,
        `Cannot cancel order in status: ${order.status}`,
      );
    }

    const previousStatus = order.status;
    const cancelledAt = new Date();

    await this.orderRepo.update(input.orderId, {
      status: 'cancelled',
      notes: order.notes
        ? `${order.notes}\n[CANCELLED] ${input.reason}`
        : `[CANCELLED] ${input.reason}`,
    });

    // Cancel all pending order items
    await this.prisma.orderItem.updateMany({
      where: {
        orderId: input.orderId,
        status: { notIn: ['served', 'cancelled'] },
      },
      data: { status: 'cancelled' },
    });

    // If table was assigned, free it
    if (order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'available', currentOrderId: null, occupiedAt: null },
      });
    }

    this.eventBus.publish(
      new OrderStatusChangedEvent(input.orderId, order.outletId, previousStatus, 'cancelled'),
    );

    return {
      orderId: input.orderId,
      previousStatus,
      cancelledAt,
      reason: input.reason,
    };
  }
}
