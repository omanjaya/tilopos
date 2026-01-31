import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IOrderRepository } from '@domain/interfaces/repositories/order.repository';

export interface UpdateOrderStatusInput {
  orderId: string;
  status: 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  employeeId: string;
}

export interface UpdateOrderStatusOutput {
  orderId: string;
  previousStatus: string;
  newStatus: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'completed', 'cancelled'],
  served: ['completed'],
};

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.ORDER)
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(input: UpdateOrderStatusInput): Promise<UpdateOrderStatusOutput> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, `Order ${input.orderId} not found`);
    }

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        ErrorCode.ORDER_NOT_FOUND,
        `Cannot transition from ${order.status} to ${input.status}`,
      );
    }

    const previousStatus = order.status;

    const updateData: Record<string, unknown> = { status: input.status };
    if (input.status === 'preparing') updateData.startedAt = new Date();
    if (input.status === 'completed') updateData.completedAt = new Date();

    await this.orderRepo.update(input.orderId, updateData);

    this.eventBus.publish(
      new OrderStatusChangedEvent(input.orderId, order.outletId, previousStatus, input.status),
    );

    return {
      orderId: input.orderId,
      previousStatus,
      newStatus: input.status,
    };
  }
}
