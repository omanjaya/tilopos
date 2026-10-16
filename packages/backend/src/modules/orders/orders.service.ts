import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { OrderPriorityLevel } from '../../application/dtos/order-priority.dto';

const PRIORITY_MAP: Record<OrderPriorityLevel, number> = {
  normal: 0,
  urgent: 5,
  vip: 10,
};

const PRIORITY_EDITABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing'];
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
const DEFAULT_LIST_LIMIT = 200;

export interface SetPriorityResult {
  orderId: string;
  priority: OrderPriorityLevel;
  numericPriority: number;
}

export interface OrderListItem {
  id: string;
  outletId: string;
  orderNumber: string;
  orderType: string;
  tableId: string | null;
  customerId: string | null;
  status: string;
  priority: number;
  notes: string | null;
  estimatedTime: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string | null;
    variantId: string | null;
    productName: string;
    quantity: number;
    station: string | null;
    status: string;
    notes: string | null;
    modifiers: unknown[];
  }>;
  tableName: string | null;
  customerName: string | null;
  elapsedMinutes: number;
}

const ORDER_LIST_INCLUDE = {
  items: true,
  table: { select: { name: true } },
  customer: { select: { name: true } },
} satisfies Prisma.OrderInclude;

type OrderListRow = Prisma.OrderGetPayload<{ include: typeof ORDER_LIST_INCLUDE }>;

function toOrderListItem(order: OrderListRow, now: number): OrderListItem {
  return {
    id: order.id,
    outletId: order.outletId,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableId: order.tableId,
    customerId: order.customerId,
    status: order.status,
    priority: order.priority,
    notes: order.notes,
    estimatedTime: order.estimatedTime,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      quantity: item.quantity,
      station: item.station,
      status: item.status,
      notes: item.notes,
      modifiers: [], // OrderItems don't have modifiers in the current schema
    })),
    tableName: order.table?.name ?? null,
    customerName: order.customer?.name ?? null,
    elapsedMinutes: Math.floor((now - order.createdAt.getTime()) / 60000),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Orders of the given (already access-checked) outlets. Without a status the
   * active orders are returned. Capped, newest first.
   */
  async listOrders(
    outletIds: string[],
    filter: { status?: OrderStatus; limit?: number } = {},
  ): Promise<OrderListItem[]> {
    if (outletIds.length === 0) return [];
    const orders = await this.prisma.order.findMany({
      where: {
        outletId: { in: outletIds },
        status: filter.status ?? { in: ACTIVE_STATUSES },
      },
      include: ORDER_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter.limit ?? DEFAULT_LIST_LIMIT, DEFAULT_LIST_LIMIT),
    });

    const now = Date.now();
    return orders.map((order) => toOrderListItem(order, now));
  }

  /**
   * One order of the caller's business with table and customer names (same shape as
   * a list row). 404 for unknown or foreign orders.
   */
  async getOrder(orderId: string, businessId: string): Promise<OrderListItem> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, outlet: { businessId } },
      include: ORDER_LIST_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return toOrderListItem(order, Date.now());
  }

  async setPriority(
    orderId: string,
    businessId: string,
    priority: OrderPriorityLevel,
  ): Promise<SetPriorityResult> {
    const numericPriority = PRIORITY_MAP[priority];
    const where: Prisma.OrderWhereInput = { id: orderId, outlet: { businessId } };

    const updated = await this.prisma.order.updateMany({
      where: { ...where, status: { in: PRIORITY_EDITABLE_STATUSES } },
      data: { priority: numericPriority },
    });
    if (updated.count === 0) {
      const order = await this.prisma.order.findFirst({ where, select: { status: true } });
      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }
      throw new ConflictException(`Cannot change priority for order in status: ${order.status}`);
    }

    return { orderId, priority, numericPriority };
  }
}
