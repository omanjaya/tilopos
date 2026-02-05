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
    return this.prisma.product.findMany({
      where: { businessId, isActive: true },
      include: { variants: true, category: true },
    });
  }

  async findStoreOrders(storeId: string, status?: string): Promise<StoreOrderRecord[]> {
    return this.prisma.storeOrder.findMany({
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
    return this.prisma.storeOrder.create({
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
  }

  async updateOrderStatus(id: string, status: string): Promise<StoreOrderRecord> {
    return this.prisma.storeOrder.update({
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
  }
}
