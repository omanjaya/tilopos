import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { StockLevelChangedEvent } from '../../domain/events/stock-level-changed.event';
import { PrismaService } from '../database/prisma.service';
import { SERVICE_TOKENS } from '../services/service.tokens';
import type {
  INotificationService,
  NotificationPayload,
} from '../../domain/interfaces/services/notification.service';
import { withRetry } from './retry';

@Injectable()
export class StockEventListener implements OnModuleInit {
  private readonly logger = new Logger(StockEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    @Inject(SERVICE_TOKENS.NOTIFICATION)
    private readonly notificationService: INotificationService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(StockLevelChangedEvent).subscribe((event) => {
      void withRetry(this.logger, `StockLevelChangedEvent for product ${event.productId}`, () =>
        this.handleStockLevelChanged(event),
      );
    });
  }

  async handleStockLevelChanged(event: StockLevelChangedEvent): Promise<void> {
    const stockLevel = await this.prisma.stockLevel.findFirst({
      where: {
        outletId: event.outletId,
        productId: event.productId,
        variantId: event.variantId,
      },
      include: {
        product: { select: { name: true, businessId: true } },
        variant: { select: { name: true } },
        outlet: { select: { name: true } },
      },
    });

    if (!stockLevel?.product) return;

    // Alert only when the level crosses the threshold, not on every sale below it.
    const threshold = stockLevel.lowStockAlert;
    if (!(event.previousQuantity > threshold && event.newQuantity <= threshold)) return;

    const businessId = stockLevel.product.businessId;
    const productName = stockLevel.variant
      ? `${stockLevel.product.name} (${stockLevel.variant.name})`
      : stockLevel.product.name;

    this.logger.warn(
      `Low stock alert: ${productName} at ${event.newQuantity} units (threshold: ${threshold})`,
    );

    const managers = await this.prisma.employee.findMany({
      where: {
        businessId,
        role: { in: ['owner', 'manager'] },
        isActive: true,
        OR: [{ outletId: event.outletId }, { outletId: null }, { role: 'owner' }],
      },
      select: { id: true, email: true },
    });

    // No push tokens are stored for employees, so alerts go by e-mail. The dispatcher records
    // the real delivery outcome (sent / failed NOT_CONFIGURED / NO_RECIPIENT) in notification_logs.
    const notifications: NotificationPayload[] = managers.map((manager) => ({
      recipientId: manager.id,
      channel: 'email',
      title: 'Low Stock Alert',
      body: `${productName} at ${stockLevel.outlet.name} is low on stock (${event.newQuantity} remaining)`,
      metadata: {
        businessId,
        notificationType: 'low_stock',
        email: manager.email ?? undefined,
        productId: event.productId,
        variantId: event.variantId,
        outletId: event.outletId,
        currentQuantity: event.newQuantity,
        threshold,
      },
    }));

    if (notifications.length > 0) {
      await this.notificationService.sendBulk(notifications);
    }
  }
}
