import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { KitchenStation } from '../../../modules/kds/kds.gateway';

export interface StationOrderItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string | null;
  productName: string;
  quantity: number;
  station: string | null;
  status: string;
  notes: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  tableId: string | null;
  orderType: string;
  priority: number;
  customerId: string | null;
  orderNotes: string | null;
}

export interface GetStationOrdersParams {
  outletId: string;
  station?: KitchenStation;
  status?: string;
  includeCompleted?: boolean;
}

export interface GetStationOrdersResult {
  items: StationOrderItem[];
  summary: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    completed: number;
  };
}

@Injectable()
export class GetStationOrdersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GetStationOrdersParams): Promise<GetStationOrdersResult> {
    const { outletId, station, status, includeCompleted = false } = params;

    // Build where clause
    const where: Record<string, unknown> = {
      order: {
        outletId,
      },
    };

    if (station) {
      where.station = station;
    }

    if (status) {
      where.status = status;
    }

    if (!includeCompleted) {
      where.status = { in: ['pending', 'preparing', 'ready'] };
    }

    // Get order items with their related data
    const orderItems = await this.prisma.orderItem.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            tableId: true,
            orderType: true,
            priority: true,
            customerId: true,
            notes: true,
          },
        },
      },
      orderBy: [
        { order: { priority: 'desc' } },
        { createdAt: 'asc' },
      ],
    });

    // Transform to result format
    const items: StationOrderItem[] = orderItems.map(item => ({
      id: item.id,
      orderId: item.orderId,
      orderNumber: (item.order as { orderNumber: string }).orderNumber,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      station: item.station,
      status: item.status,
      notes: item.notes,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      tableId: (item.order as { tableId: string | null }).tableId,
      orderType: (item.order as { orderType: string }).orderType,
      priority: (item.order as { priority: number }).priority,
      customerId: (item.order as { customerId: string | null }).customerId,
      orderNotes: (item.order as { notes: string | null }).notes,
    }));

    // Calculate summary
    const summary = {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      preparing: items.filter(i => i.status === 'preparing').length,
      ready: items.filter(i => i.status === 'ready').length,
      completed: items.filter(i => i.status === 'completed').length,
    };

    return { items, summary };
  }

  /**
   * Get all available stations for an outlet
   */
  async getAvailableStations(outletId: string): Promise<string[]> {
    // Get unique stations from active order items
    const stations = await this.prisma.orderItem.findMany({
      where: {
        order: { outletId },
        station: { not: null },
        status: { in: ['pending', 'preparing', 'ready'] },
      },
      select: { station: true },
      distinct: ['station'],
    });

    const stationList = stations.map(s => s.station).filter(Boolean) as string[];

    // Always include default stations
    const defaultStations: KitchenStation[] = ['grill', 'fryer', 'cold', 'hot', 'drinks', 'dessert', 'general'];

    return [...new Set([...stationList, ...defaultStations])].sort();
  }
}
