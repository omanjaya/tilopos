import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface KitchenAnalytics {
  totalOrdersToday: number;
  completedToday: number;
  avgPrepTime: number; // in minutes
  overdueOrders: number;
  ordersByHour: { hour: number; count: number }[];
  ordersByStation: { station: string; count: number; avgTime: number }[];
  topDelayedItems: { productName: string; avgTime: number; count: number }[];
}

@Injectable()
export class KdsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(outletId: string, date?: Date): Promise<KitchenAnalytics> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all orders for today
    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    const totalOrdersToday = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const completedToday = completedOrders.length;

    // Calculate average prep time
    let totalPrepTime = 0;
    let prepTimeCount = 0;
    orders.forEach((order) => {
      if (order.completedAt && order.createdAt) {
        const prepTime = (order.completedAt.getTime() - order.createdAt.getTime()) / 60000;
        totalPrepTime += prepTime;
        prepTimeCount++;
      }
    });
    const avgPrepTime = prepTimeCount > 0 ? Math.round(totalPrepTime / prepTimeCount) : 0;

    // Count overdue orders (pending/preparing for > 15 minutes)
    const now = new Date();
    const overdueOrders = orders.filter((o) => {
      if (o.status === 'pending' || o.status === 'preparing') {
        const ageMinutes = (now.getTime() - o.createdAt.getTime()) / 60000;
        return ageMinutes > 15;
      }
      return false;
    }).length;

    // Orders by hour
    const hourlyMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, 0);
    }
    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });
    const ordersByHour = Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count }));

    // Orders by station (simplified - using notes or category as station indicator)
    const stationMap = new Map<
      string,
      { count: number; completedCount: number; totalTime: number }
    >();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const station = (item.station as string) || 'general';
        const current = stationMap.get(station) || { count: 0, completedCount: 0, totalTime: 0 };
        current.count++;
        if (order.completedAt && order.createdAt) {
          current.completedCount++;
          current.totalTime += (order.completedAt.getTime() - order.createdAt.getTime()) / 60000;
        }
        stationMap.set(station, current);
      });
    });
    const ordersByStation = Array.from(stationMap.entries()).map(([station, data]) => ({
      station,
      count: data.count,
      avgTime: data.completedCount > 0 ? Math.round(data.totalTime / data.completedCount) : 0,
    }));

    // Top delayed items — only count items where prep time > 10 minutes
    const itemDelays = new Map<string, { totalTime: number; delayedCount: number }>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (order.completedAt && order.createdAt) {
          const prepTime = (order.completedAt.getTime() - order.createdAt.getTime()) / 60000;
          if (prepTime > 10) {
            const productName = item.product?.name || item.productName;
            const current = itemDelays.get(productName) || { totalTime: 0, delayedCount: 0 };
            current.delayedCount++;
            current.totalTime += prepTime;
            itemDelays.set(productName, current);
          }
        }
      });
    });
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

  async markItemPreparing(orderItemId: string, _employeeId: string, station: string) {
    return this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'preparing',
        startedAt: new Date(),
        station,
      },
    });
  }

  async markItemReady(orderItemId: string, _employeeId: string) {
    // Wrap in transaction to prevent race conditions when multiple items are marked ready concurrently
    const item = await this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'ready',
          completedAt: new Date(),
        },
        include: {
          order: { select: { id: true, outletId: true } },
        },
      });

      // Check if all items are ready
      const allItems = await tx.orderItem.findMany({
        where: { orderId: updatedItem.order.id },
        select: { status: true },
      });

      const allReady = allItems.every((i) => i.status === 'ready' || i.status === 'served');
      if (allReady) {
        await tx.order.update({
          where: { id: updatedItem.order.id },
          data: { status: 'ready' },
        });
      }

      return updatedItem;
    });

    return item;
  }

  async recallItem(orderItemId: string, reason?: string) {
    return this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'preparing',
        notes: reason ? `RECALLED: ${reason}` : 'RECALLED',
      },
    });
  }

  async getPerformanceReport(outletId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });

    const totalOrders = orders.length;
    let totalPrepTime = 0;
    let onTimeCount = 0;

    orders.forEach((order) => {
      if (order.completedAt && order.createdAt) {
        const prepTime = (order.completedAt.getTime() - order.createdAt.getTime()) / 60000;
        totalPrepTime += prepTime;
        if (prepTime <= 15) {
          onTimeCount++;
        }
      }
    });

    return {
      totalOrders,
      avgPrepTime: totalOrders > 0 ? Math.round(totalPrepTime / totalOrders) : 0,
      onTimeRate: totalOrders > 0 ? Math.round((onTimeCount / totalOrders) * 100) : 0,
      onTimeCount,
      lateCount: totalOrders - onTimeCount,
    };
  }
}
