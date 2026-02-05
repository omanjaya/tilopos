import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { KdsGateway } from './kds.gateway';

// ============================================================================
// Interfaces
// ============================================================================

export interface CookingTimerSettings {
  dineIn: number; // minutes
  takeaway: number; // minutes
  delivery: number; // minutes
}

export interface CookingTimerSettingsResult {
  businessId: string;
  settings: CookingTimerSettings;
  updatedAt: string;
}

export interface OverdueOrder {
  orderId: string;
  orderNumber: string;
  orderType: string;
  status: string;
  createdAt: Date;
  elapsedMinutes: number;
  slaMinutes: number;
  overdueBy: number;
  tableId: string | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    station: string | null;
    status: string;
  }[];
}

export interface OverdueOrdersResult {
  overdue: OverdueOrder[];
  total: number;
}

const DEFAULT_TIMER_SETTINGS: CookingTimerSettings = {
  dineIn: 15,
  takeaway: 10,
  delivery: 20,
};

@Injectable()
export class KdsService {
  private readonly logger = new Logger(KdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kdsGateway: KdsGateway,
  ) {}

  // ========================================================================
  // COOKING TIMER SETTINGS
  // ========================================================================

  /**
   * Returns SLA settings per order type (dine-in, takeaway, delivery).
   */
  async getCookingTimerSettings(businessId: string): Promise<CookingTimerSettingsResult> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const businessSettings = (business.settings as Record<string, unknown>) || {};
    const timerSettings =
      (businessSettings['cookingTimerSettings'] as CookingTimerSettings) || DEFAULT_TIMER_SETTINGS;

    return {
      businessId,
      settings: {
        dineIn: timerSettings.dineIn ?? DEFAULT_TIMER_SETTINGS.dineIn,
        takeaway: timerSettings.takeaway ?? DEFAULT_TIMER_SETTINGS.takeaway,
        delivery: timerSettings.delivery ?? DEFAULT_TIMER_SETTINGS.delivery,
      },
      updatedAt: (businessSettings['cookingTimerUpdatedAt'] as string) || new Date().toISOString(),
    };
  }

  /**
   * Update SLA timer settings for the business.
   */
  async updateCookingTimerSettings(
    businessId: string,
    settings: Partial<CookingTimerSettings>,
  ): Promise<CookingTimerSettingsResult> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const currentSettings = (business.settings as Record<string, unknown>) || {};
    const currentTimerSettings =
      (currentSettings['cookingTimerSettings'] as CookingTimerSettings) || DEFAULT_TIMER_SETTINGS;

    const updatedTimerSettings: CookingTimerSettings = {
      dineIn: settings.dineIn ?? currentTimerSettings.dineIn ?? DEFAULT_TIMER_SETTINGS.dineIn,
      takeaway:
        settings.takeaway ?? currentTimerSettings.takeaway ?? DEFAULT_TIMER_SETTINGS.takeaway,
      delivery:
        settings.delivery ?? currentTimerSettings.delivery ?? DEFAULT_TIMER_SETTINGS.delivery,
    };

    const now = new Date().toISOString();

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          cookingTimerSettings: updatedTimerSettings,
          cookingTimerUpdatedAt: now,
        } as never,
      },
    });

    this.logger.log(`Cooking timer settings updated for business ${businessId}`);

    return {
      businessId,
      settings: updatedTimerSettings,
      updatedAt: now,
    };
  }

  // ========================================================================
  // OVERDUE ORDERS
  // ========================================================================

  /**
   * Returns orders exceeding SLA time for the given outlet.
   */
  async getOverdueOrders(businessId: string, outletId: string): Promise<OverdueOrdersResult> {
    // Get timer settings
    const timerResult = await this.getCookingTimerSettings(businessId);
    const timerSettings = timerResult.settings;

    // Build SLA map by order type
    const slaMap: Record<string, number> = {
      dine_in: timerSettings.dineIn,
      takeaway: timerSettings.takeaway,
      delivery: timerSettings.delivery,
    };

    // Get active orders (not completed/cancelled)
    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        status: { in: ['pending', 'confirmed', 'preparing'] },
      },
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            station: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const overdueOrders: OverdueOrder[] = [];

    for (const order of orders) {
      const slaMinutes = slaMap[order.orderType] ?? timerSettings.dineIn;
      const elapsedMs = now.getTime() - order.createdAt.getTime();
      const elapsedMinutes = Math.round(elapsedMs / 60000);

      if (elapsedMinutes > slaMinutes) {
        overdueOrders.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          createdAt: order.createdAt,
          elapsedMinutes,
          slaMinutes,
          overdueBy: elapsedMinutes - slaMinutes,
          tableId: order.tableId,
          items: order.items.map((item) => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            station: item.station,
            status: item.status,
          })),
        });
      }
    }

    // Sort by most overdue first
    overdueOrders.sort((a, b) => b.overdueBy - a.overdueBy);

    return {
      overdue: overdueOrders,
      total: overdueOrders.length,
    };
  }

  // ========================================================================
  // ORDER READY NOTIFICATION
  // ========================================================================

  /**
   * Sends WebSocket event to cashier when order is bumped to "ready".
   * Emits `order:ready` event to the outlet room.
   */
  async notifyCashierOrderReady(
    orderId: string,
  ): Promise<{ notified: boolean; orderId: string; orderNumber: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        outletId: true,
        status: true,
        orderType: true,
        tableId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Emit order:ready event to the outlet room via the gateway
    this.kdsGateway.emitToOutlet(order.outletId, 'order:ready', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      outletId: order.outletId,
      orderType: order.orderType,
      tableId: order.tableId,
      status: order.status,
      readyAt: new Date().toISOString(),
    });

    this.logger.log(
      `Order ready notification sent for order ${order.orderNumber} to outlet ${order.outletId}`,
    );

    return {
      notified: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }
}
