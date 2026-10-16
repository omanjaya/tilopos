import { Injectable } from '@nestjs/common';
import type { OrderItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { KitchenStation } from '../../../modules/kds/kds.gateway';
import { startOfBusinessDay } from '../../../shared/utils/business-time';

const ACTIVE_ITEM_STATUSES: OrderItemStatus[] = ['pending', 'preparing', 'ready'];
/** Hard cap on items returned to one KDS screen (R13). */
const MAX_ITEMS = 500;

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
  tableName: string | null;
  /** Order items carry no modifiers in the current schema. */
  modifiers: unknown[];
}

export interface GetStationOrdersParams {
  /** Must already be access-checked (TenantAccessService.assertOutlet). */
  outletId: string;
  station?: KitchenStation;
  status?: OrderItemStatus;
  includeCompleted?: boolean;
}

export interface GetStationOrdersResult {
  items: StationOrderItem[];
  summary: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    served: number;
    /** @deprecated same as `served` (bumped items are 'ready', delivered ones 'served'). */
    completed: number;
  };
}

@Injectable()
export class GetStationOrdersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GetStationOrdersParams): Promise<GetStationOrdersResult> {
    const { outletId, station, status, includeCompleted = false } = params;

    if (!outletId) {
      throw new Error('GetStationOrdersUseCase: outletId is required');
    }

    // Active items only by default; with includeCompleted, today's history too
    // (bounded to the business day). An explicit status narrows either view.
    const where: Prisma.OrderItemWhereInput = {
      order: { outletId },
      ...(station ? { station } : {}),
    };
    if (includeCompleted) {
      // Everything still active plus whatever was finished/cancelled today.
      where.OR = [
        { status: { in: ACTIVE_ITEM_STATUSES } },
        { createdAt: { gte: startOfBusinessDay() } },
      ];
      if (status) where.status = status;
    } else if (status) {
      // Finished statuses are only visible with includeCompleted.
      where.status = ACTIVE_ITEM_STATUSES.includes(status) ? status : { in: [] };
    } else {
      where.status = { in: ACTIVE_ITEM_STATUSES };
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
            table: { select: { name: true } },
          },
        },
      },
      orderBy: [{ order: { priority: 'desc' } }, { createdAt: 'asc' }],
      take: MAX_ITEMS,
    });

    // Transform to result format
    const items: StationOrderItem[] = orderItems.map((item) => ({
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
      tableName: item.order.table?.name ?? null,
      modifiers: [],
    }));

    // Calculate summary
    const summary = {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      preparing: items.filter((i) => i.status === 'preparing').length,
      ready: items.filter((i) => i.status === 'ready').length,
      served: items.filter((i) => i.status === 'served').length,
      completed: items.filter((i) => i.status === 'served').length,
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

    const stationList = stations.map((s) => s.station).filter(Boolean) as string[];

    // Always include default stations
    const defaultStations: KitchenStation[] = [
      'grill',
      'fryer',
      'cold',
      'hot',
      'drinks',
      'dessert',
      'general',
    ];

    return [...new Set([...stationList, ...defaultStations])].sort();
  }
}
