import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { StockLevelChangedEvent } from '../../domain/events/stock-level-changed.event';
import { PrismaService } from '../database/prisma.service';
import { SERVICE_TOKENS } from '../services/service.tokens';
import type { INotificationService } from '../../domain/interfaces/services/notification.service';

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
    this.eventBus.ofType(StockLevelChangedEvent).subscribe(event => {
      void this.handleStockLevelChanged(event);
    });
  }

  private async handleStockLevelChanged(event: StockLevelChangedEvent): Promise<void> {
    try {
      const stockLevel = await this.prisma.stockLevel.findFirst({
        where: {
          outletId: event.outletId,
          productId: event.productId,
          variantId: event.variantId,
        },
        include: {
          product: { select: { name: true, businessId: true } },
          variant: { select: { name: true } },
        },
      });

      if (!stockLevel) return;

      const alertThreshold = stockLevel.lowStockAlert;
      if (event.newQuantity > alertThreshold) return;

      if (!stockLevel.product) return;

      const productName = stockLevel.variant
        ? `${stockLevel.product.name} (${stockLevel.variant.name})`
        : stockLevel.product.name;

      this.logger.warn(
        `Low stock alert: ${productName} at ${event.newQuantity} units (threshold: ${alertThreshold})`,
      );

      const outlet = await this.prisma.outlet.findUnique({
        where: { id: event.outletId },
        select: { name: true, businessId: true },
      });

      const managers = await this.prisma.employee.findMany({
        where: {
          businessId: stockLevel.product.businessId,
          role: { in: ['owner', 'manager'] },
          isActive: true,
        },
        select: { id: true },
      });

      for (const manager of managers) {
        await this.notificationService.send({
          recipientId: manager.id,
          channel: 'push',
          title: 'Low Stock Alert',
          body: `${productName} at ${outlet?.name || 'outlet'} is low on stock (${event.newQuantity} remaining)`,
          metadata: {
            type: 'low_stock',
            productId: event.productId,
            variantId: event.variantId,
            outletId: event.outletId,
            currentQuantity: event.newQuantity,
            threshold: alertThreshold,
          },
        });
      }

      await this.prisma.notificationLog.create({
        data: {
          businessId: stockLevel.product.businessId,
          notificationType: 'low_stock',
          channel: 'push',
          title: 'Low Stock Alert',
          body: `${productName} is low on stock (${event.newQuantity} remaining)`,
          metadata: {
            productId: event.productId,
            variantId: event.variantId,
            outletId: event.outletId,
          },
          status: 'sent',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to process StockLevelChangedEvent for product ${event.productId}`, error);
    }
  }
}
