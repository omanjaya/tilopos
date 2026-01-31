import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrderEventListener implements OnModuleInit {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe(event => {
      void this.handleOrderStatusChanged(event);
    });
  }

  private async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    try {
      await this.logAudit(event);

      if (event.newStatus === 'completed') {
        await this.handleOrderCompleted(event);
      }
    } catch (error) {
      this.logger.error(`Failed to process OrderStatusChangedEvent for ${event.orderId}`, error);
    }
  }

  private async logAudit(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { outlet: { select: { businessId: true } } },
    });

    if (!order) return;

    await this.prisma.auditLog.create({
      data: {
        businessId: order.outlet.businessId,
        outletId: event.outletId,
        action: 'order_status_changed',
        entityType: 'order',
        entityId: event.orderId,
        oldValue: { status: event.previousStatus },
        newValue: { status: event.newStatus },
      },
    });
  }

  private async handleOrderCompleted(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      select: { tableId: true },
    });

    if (order?.tableId) {
      const activeOrders = await this.prisma.order.count({
        where: {
          tableId: order.tableId,
          status: { notIn: ['completed', 'cancelled'] },
        },
      });

      // Use updateMany with additional condition to prevent race
      if (activeOrders === 0) {
        await this.prisma.table.updateMany({
          where: {
            id: order.tableId,
            status: { not: 'available' },
          },
          data: { status: 'available' },
        });
      }
    }
  }
}
