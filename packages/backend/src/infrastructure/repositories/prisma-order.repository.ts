import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { IOrderRepository, OrderRecord } from '../../domain/interfaces/repositories/order.repository';

interface OrderItemInput {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  quantity: number;
  station: string | null;
  status: string;
  notes: string | null;
}

interface OrderRecordWithItems extends OrderRecord {
  items?: OrderItemInput[];
}

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<OrderRecordWithItems | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return null;
    }

    return this.mapToRecord(order);
  }

  async findByOutletId(outletId: string): Promise<OrderRecord[]> {
    const orders = await this.prisma.order.findMany({
      where: { outletId },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapToBaseRecord(order));
  }

  async findActiveByOutletId(outletId: string): Promise<OrderRecord[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        outletId,
        status: {
          notIn: ['completed', 'cancelled'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapToBaseRecord(order));
  }

  async save(order: OrderRecordWithItems): Promise<OrderRecord> {
    const { items, ...orderData } = order;

    const created = await this.prisma.order.create({
      data: {
        id: orderData.id,
        outletId: orderData.outletId,
        orderNumber: orderData.orderNumber,
        orderType: orderData.orderType as Prisma.EnumOrderTypeFilter['equals'],
        tableId: orderData.tableId,
        customerId: orderData.customerId,
        status: orderData.status as Prisma.EnumOrderStatusFilter['equals'],
        priority: orderData.priority,
        notes: orderData.notes,
        estimatedTime: orderData.estimatedTime,
        items: items && items.length > 0
          ? {
              create: items.map((item) => ({
                id: item.id,
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName,
                quantity: item.quantity,
                station: item.station,
                status: item.status as Prisma.EnumOrderItemStatusFilter['equals'],
                notes: item.notes,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return this.mapToRecord(created);
  }

  async update(id: string, data: Partial<OrderRecord>): Promise<OrderRecord> {
    const updateData: Prisma.OrderUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status as Prisma.EnumOrderStatusFilter['equals'];
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.estimatedTime !== undefined) {
      updateData.estimatedTime = data.estimatedTime;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
    });

    return this.mapToBaseRecord(updated);
  }

  private mapToBaseRecord(order: {
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
    createdAt: Date;
    updatedAt: Date;
  }): OrderRecord {
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapToRecord(order: {
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
    createdAt: Date;
    updatedAt: Date;
    items?: Array<{
      id: string;
      productId: string | null;
      variantId: string | null;
      productName: string;
      quantity: number;
      station: string | null;
      status: string;
      notes: string | null;
    }>;
  }): OrderRecordWithItems {
    const base = this.mapToBaseRecord(order);
    return {
      ...base,
      items: order.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        quantity: item.quantity,
        station: item.station,
        status: item.status,
        notes: item.notes,
      })),
    };
  }
}
