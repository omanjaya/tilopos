import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrderItemStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import {
  businessDayRange,
  businessHour,
  parseBusinessDate,
} from '../../shared/utils/business-time';
import { KdsService, type CookingTimerSettings } from './kds.service';

export interface KitchenAnalytics {
  totalOrdersToday: number;
  completedToday: number;
  avgPrepTime: number; // in minutes
  overdueOrders: number;
  ordersByHour: { hour: number; count: number }[];
  ordersByStation: { station: string; count: number; avgTime: number }[];
  topDelayedItems: { productName: string; avgTime: number; count: number }[];
}

/** Maximum span of a performance report (R13). */
export const MAX_PERFORMANCE_RANGE_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

function slaFor(orderType: string, settings: CookingTimerSettings): number {
  if (orderType === 'takeaway') return settings.takeaway;
  if (orderType === 'delivery') return settings.delivery;
  return settings.dineIn;
}

@Injectable()
export class KdsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kdsService: KdsService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Kitchen analytics for one business day (Asia/Jakarta). `outletId` must be
   * access-checked by the caller.
   */
  async getAnalytics(
    outletId: string,
    businessId: string,
    date?: string,
  ): Promise<KitchenAnalytics> {
    const { start, end } = date ? parseBusinessDate(date) : businessDayRange();
    const { settings } = await this.kdsService.getCookingTimerSettings(businessId);

    const orders = await this.prisma.order.findMany({
      where: { outletId, createdAt: { gte: start, lte: end } },
      select: {
        status: true,
        orderType: true,
        createdAt: true,
        completedAt: true,
        items: { select: { station: true, productName: true } },
      },
    });

    const totalOrdersToday = orders.length;
    const completedToday = orders.filter((o) => o.status === 'completed').length;

    let totalPrepTime = 0;
    let prepTimeCount = 0;
    for (const order of orders) {
      if (order.completedAt) {
        totalPrepTime += (order.completedAt.getTime() - order.createdAt.getTime()) / 60000;
        prepTimeCount++;
      }
    }
    const avgPrepTime = prepTimeCount > 0 ? Math.round(totalPrepTime / prepTimeCount) : 0;

    // Overdue = still in the kitchen longer than the configured SLA for its order type.
    const now = Date.now();
    const overdueOrders = orders.filter((o) => {
      if (o.status !== 'pending' && o.status !== 'confirmed' && o.status !== 'preparing') {
        return false;
      }
      return (now - o.createdAt.getTime()) / 60000 > slaFor(o.orderType, settings);
    }).length;

    const hourly = new Array<number>(24).fill(0);
    for (const order of orders) {
      hourly[businessHour(order.createdAt)]++;
    }
    const ordersByHour = hourly.map((count, hour) => ({ hour, count }));

    const stationMap = new Map<
      string,
      { count: number; completedCount: number; totalTime: number }
    >();
    const itemDelays = new Map<string, { totalTime: number; delayedCount: number }>();
    for (const order of orders) {
      const prepTime = order.completedAt
        ? (order.completedAt.getTime() - order.createdAt.getTime()) / 60000
        : null;
      const sla = slaFor(order.orderType, settings);
      for (const item of order.items) {
        const station = item.station || 'general';
        const current = stationMap.get(station) ?? { count: 0, completedCount: 0, totalTime: 0 };
        current.count++;
        if (prepTime !== null) {
          current.completedCount++;
          current.totalTime += prepTime;
        }
        stationMap.set(station, current);

        if (prepTime !== null && prepTime > sla) {
          const delay = itemDelays.get(item.productName) ?? { totalTime: 0, delayedCount: 0 };
          delay.delayedCount++;
          delay.totalTime += prepTime;
          itemDelays.set(item.productName, delay);
        }
      }
    }

    const ordersByStation = Array.from(stationMap.entries()).map(([station, data]) => ({
      station,
      count: data.count,
      avgTime: data.completedCount > 0 ? Math.round(data.totalTime / data.completedCount) : 0,
    }));

    const topDelayedItems = Array.from(itemDelays.entries())
      .map(([productName, data]) => ({
        productName,
        avgTime: Math.round(data.totalTime / data.delayedCount),
        count: data.delayedCount,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      totalOrdersToday,
      completedToday,
      avgPrepTime,
      overdueOrders,
      ordersByHour,
      ordersByStation,
      topDelayedItems,
    };
  }

  /** pending → preparing. Moves a pending/confirmed order to 'preparing' as well. */
  async markItemPreparing(orderItemId: string, businessId: string, station?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const item = await this.findScopedItem(tx, orderItemId, businessId);
      if (!['pending', 'confirmed', 'preparing'].includes(item.order.status)) {
        throw new ConflictException(`Order is ${item.order.status}`);
      }
      const updated = await tx.orderItem.updateMany({
        where: { id: item.id, status: 'pending' },
        data: {
          status: 'preparing',
          startedAt: new Date(),
          ...(station ? { station } : {}),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(`Item is ${item.status} and cannot start preparing`);
      }
      const orderMoved = await tx.order.updateMany({
        where: { id: item.order.id, status: { in: ['pending', 'confirmed'] } },
        data: { status: 'preparing', startedAt: new Date() },
      });
      return { item, orderMoved: orderMoved.count === 1 };
    });

    if (result.orderMoved) {
      this.eventBus.publish(
        new OrderStatusChangedEvent(
          result.item.order.id,
          result.item.order.outletId,
          result.item.order.status,
          'preparing',
        ),
      );
    }
    return this.prisma.orderItem.findFirst({ where: { id: orderItemId } });
  }

  /**
   * Sends a ready/served item back to the kitchen. The reason is appended to the
   * item notes (original notes are kept) and the order returns to 'preparing'.
   */
  async recallItem(orderItemId: string, businessId: string, reason?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const item = await this.findScopedItem(tx, orderItemId, businessId);
      const recallable: OrderStatus[] = ['preparing', 'ready', 'served'];
      if (!recallable.includes(item.order.status)) {
        throw new ConflictException(`Cannot recall an item of a ${item.order.status} order`);
      }
      const recallNote = reason ? `RECALLED: ${reason}` : 'RECALLED';
      const itemStatuses: OrderItemStatus[] = ['ready', 'served'];
      const updated = await tx.orderItem.updateMany({
        where: { id: item.id, status: { in: itemStatuses } },
        data: {
          status: 'preparing',
          completedAt: null,
          notes: item.notes ? `${item.notes}\n${recallNote}` : recallNote,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(`Item is ${item.status} and cannot be recalled`);
      }
      const orderMoved = await tx.order.updateMany({
        where: { id: item.order.id, status: { in: ['ready', 'served'] } },
        data: { status: 'preparing' },
      });
      return { item, orderMoved: orderMoved.count === 1 };
    });

    if (result.orderMoved) {
      this.eventBus.publish(
        new OrderStatusChangedEvent(
          result.item.order.id,
          result.item.order.outletId,
          result.item.order.status,
          'preparing',
        ),
      );
    }
    return this.prisma.orderItem.findFirst({ where: { id: orderItemId } });
  }

  async getPerformanceReport(outletId: string, businessId: string, startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
    if (endDate.getTime() - startDate.getTime() > MAX_PERFORMANCE_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`Date range may not exceed ${MAX_PERFORMANCE_RANGE_DAYS} days`);
    }

    const { settings } = await this.kdsService.getCookingTimerSettings(businessId);
    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'completed',
        completedAt: { not: null },
      },
      select: { orderType: true, createdAt: true, completedAt: true },
    });

    const totalOrders = orders.length;
    let totalPrepTime = 0;
    let onTimeCount = 0;
    for (const order of orders) {
      const prepTime = ((order.completedAt as Date).getTime() - order.createdAt.getTime()) / 60000;
      totalPrepTime += prepTime;
      if (prepTime <= slaFor(order.orderType, settings)) {
        onTimeCount++;
      }
    }

    return {
      totalOrders,
      avgPrepTime: totalOrders > 0 ? Math.round(totalPrepTime / totalOrders) : 0,
      onTimeRate: totalOrders > 0 ? Math.round((onTimeCount / totalOrders) * 100) : 0,
      onTimeCount,
      lateCount: totalOrders - onTimeCount,
    };
  }

  private async findScopedItem(
    tx: Pick<PrismaService, 'orderItem'>,
    orderItemId: string,
    businessId: string,
  ) {
    const item = await tx.orderItem.findFirst({
      where: { id: orderItemId, order: { outlet: { businessId } } },
      select: {
        id: true,
        status: true,
        notes: true,
        order: { select: { id: true, status: true, outletId: true } },
      },
    });
    if (!item) {
      throw new NotFoundException(`Order item ${orderItemId} not found`);
    }
    return item;
  }
}
