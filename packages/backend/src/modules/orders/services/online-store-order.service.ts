/**
 * Online Store Order Service
 *
 * Responsibilities:
 * - Create store orders
 * - Update order status
 * - Get order list
 * - Process payments
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  StoreOrderInfo,
  CreateStoreOrderDto,
  StorePaymentResult,
  GetStoreOrdersOptions,
  StoreOrderItem,
} from '../types/online-store.types';
import { StoreOrderStatus } from '@prisma/client';

@Injectable()
export class OnlineStoreOrderService {
  private readonly logger = new Logger(OnlineStoreOrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create store order
   */
  async createOrder(storeId: string, data: CreateStoreOrderDto): Promise<StoreOrderInfo> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
    });

    if (!store) throw new NotFoundException('Store not found');

    // Get product details
    const productIds = data.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const orderItems: StoreOrderItem[] = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.basePrice),
        subtotal: Number(product.basePrice) * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingCost = data.shippingAddress ? 0 : 0;
    const discountAmount = 0;
    const grandTotal = subtotal + shippingCost - discountAmount;

    // Generate order number
    const orderCount = await this.prisma.storeOrder.count({
      where: { storeId },
    });
    const orderNumber = `ON${(orderCount + 1).toString().padStart(4, '0')}`;

    const order = await this.prisma.storeOrder.create({
      data: {
        storeId,
        outletId: data.outletId,
        orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        shippingAddress: data.shippingAddress,
        subtotal,
        shippingCost,
        discountAmount,
        grandTotal,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        notes: data.notes,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    this.logger.log(`Store order created: ${orderNumber}`);

    return {
      id: order.id,
      storeId: order.storeId,
      outletId: order.outletId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      shippingAddress: order.shippingAddress || undefined,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discountAmount: Number(order.discountAmount),
      grandTotal: Number(order.grandTotal),
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      notes: order.notes || undefined,
      createdAt: order.createdAt,
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: StoreOrderStatus): Promise<void> {
    await this.prisma.storeOrder.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }

  /**
   * Process store order payment
   */
  async processPayment(
    orderId: string,
    method: 'qris' | 'bank_transfer',
  ): Promise<StorePaymentResult> {
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Mock payment response
    if (method === 'qris') {
      return {
        qrCode: `00020101021226610014ID.QRIS.WWW${order.grandTotal}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };
    } else {
      return {
        vaNumber: `8808${Math.random().toString().slice(2, 18)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
  }

  /**
   * Get store orders
   */
  async getOrders(storeId: string, options?: GetStoreOrdersOptions): Promise<StoreOrderInfo[]> {
    const orders = await this.prisma.storeOrder.findMany({
      where: {
        storeId,
        ...(options?.status && { orderStatus: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });

    return orders.map((order) => ({
      id: order.id,
      storeId: order.storeId,
      outletId: order.outletId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      shippingAddress: order.shippingAddress || undefined,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discountAmount: Number(order.discountAmount),
      grandTotal: Number(order.grandTotal),
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      notes: order.notes || undefined,
      createdAt: order.createdAt,
    }));
  }
}
