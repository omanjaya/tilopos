import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  IOnlineStoreRepository,
  OnlineStoreRecord,
  StoreOrderRecord,
  StoreProductRecord,
} from '../../domain/interfaces/repositories/online-store.repository';

@Injectable()
export class PrismaOnlineStoreRepository implements IOnlineStoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStoresByBusinessId(businessId: string): Promise<OnlineStoreRecord[]> {
    return this.prisma.onlineStore.findMany({
      where: { businessId },
    });
  }

  async createStore(data: {
    businessId: string;
    storeName: string;
    slug: string;
    description: string | null;
  }): Promise<OnlineStoreRecord> {
    return this.prisma.onlineStore.create({
      data: {
        businessId: data.businessId,
        storeName: data.storeName,
        slug: data.slug,
        description: data.description,
      },
    });
  }

  async findStoreBySlug(slug: string): Promise<OnlineStoreRecord | null> {
    return this.prisma.onlineStore.findUnique({
      where: { slug },
    });
  }

  async findActiveProductsByBusinessId(businessId: string): Promise<StoreProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      include: { variants: true, category: true },
    });

    return products.map((p) => ({
      ...p,
      basePrice: p.basePrice.toNumber(),
    }));
  }

  async findStoreOrders(storeId: string, status?: string): Promise<StoreOrderRecord[]> {
    const orders = await this.prisma.storeOrder.findMany({
      where: {
        storeId,
        ...(status && {
          orderStatus: status as
            | 'pending'
            | 'confirmed'
            | 'processing'
            | 'shipped'
            | 'delivered'
            | 'cancelled',
        }),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      ...order,
      shippingCost: order.shippingCost.toNumber(),
      subtotal: order.subtotal.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      grandTotal: order.grandTotal.toNumber(),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toNumber(),
        subtotal: item.subtotal.toNumber(),
      })),
    }));
  }

  async createStoreOrder(data: {
    storeId: string;
    outletId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    shippingAddress: string | null;
    subtotal: number;
    grandTotal: number;
    items: {
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
  }): Promise<StoreOrderRecord> {
    const order = await this.prisma.storeOrder.create({
      data: {
        storeId: data.storeId,
        outletId: data.outletId,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        shippingAddress: data.shippingAddress,
        subtotal: data.subtotal,
        grandTotal: data.grandTotal,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            productName: i.productName,
            variantName: i.variantName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
        },
      },
    });

    return {
      ...order,
      shippingCost: order.shippingCost.toNumber(),
      subtotal: order.subtotal.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      grandTotal: order.grandTotal.toNumber(),
    };
  }

  async updateOrderStatus(id: string, status: string): Promise<StoreOrderRecord> {
    const order = await this.prisma.storeOrder.update({
      where: { id },
      data: {
        orderStatus: status as
          | 'pending'
          | 'confirmed'
          | 'processing'
          | 'shipped'
          | 'delivered'
          | 'cancelled',
      },
    });

    return {
      ...order,
      shippingCost: order.shippingCost.toNumber(),
      subtotal: order.subtotal.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      grandTotal: order.grandTotal.toNumber(),
    };
  }
}
