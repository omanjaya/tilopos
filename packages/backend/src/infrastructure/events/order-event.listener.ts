import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import { PrismaService } from '../database/prisma.service';
import { withRetry } from './retry';

@Injectable()
export class OrderEventListener implements OnModuleInit {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {
      void this.handleOrderStatusChanged(event);
    });
  }

  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    await withRetry(this.logger, `OrderStatusChangedEvent audit for ${event.orderId}`, () =>
      this.logAudit(event),
    );
    if (event.newStatus === 'completed') {
      await withRetry(this.logger, `Table release for order ${event.orderId}`, () =>
        this.handleOrderCompleted(event),
      );
    }
  }

  private async logAudit(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { id: event.orderId, outletId: event.outletId },
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
    const order = await this.prisma.order.findFirst({
      where: { id: event.orderId, outletId: event.outletId },
      select: { tableId: true },
    });
    if (!order?.tableId) return;

    // Single statement: the "no active orders left" check and the release happen atomically, so
    // an order opened on the table concurrently keeps it occupied.
    await this.prisma.$executeRaw`
      UPDATE tables
         SET status = 'available', updated_at = now()
       WHERE id = ${order.tableId}::uuid
         AND status <> 'available'
         AND NOT EXISTS (
           SELECT 1 FROM orders
            WHERE table_id = ${order.tableId}::uuid
              AND status NOT IN ('completed', 'cancelled')
         )`;
  }
}
