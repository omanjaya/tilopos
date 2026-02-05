/**
 * Self-Order & Online Store Service
 *
 * Self-Order Features:
 * - QR code table ordering
 * - Menu browsing
 * - Cart management
 * - QRIS/E-wallet payment
 * - Auto-send to KDS
 *
 * Online Store Features:
 * - Product catalog sync
 * - Order management
 * - Delivery integration
 * - Payment processing
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import {
  SelfOrderSessionStatus,
  StoreOrderStatus,
  StoreOrderPaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';

// ========================================
// SELF-ORDER TYPES
// ========================================

export interface SelfOrderSessionInfo {
  id: string;
  outletId: string;
  tableId?: string;
  tableName?: string;
  sessionCode: string;
  status: SelfOrderSessionStatus;
  customerName?: string;
  language: string;
  expiresAt: Date;
  createdAt: Date;
  items: SelfOrderCartItem[];
}

export interface SelfOrderCartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  notes?: string;
  subtotal: number;
}

export interface AddToCartDto {
  sessionId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
}

export interface SelfOrderPaymentDto {
  sessionId: string;
  paymentMethod: 'qris' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';
}

// ========================================
// ONLINE STORE TYPES
// ========================================

export interface OnlineStoreConfig {
  id: string;
  businessId: string;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeSettings: Record<string, unknown>;
  shippingMethods: unknown[];
  paymentMethods: unknown[];
  isActive: boolean;
}

export interface StoreOrderInfo {
  id: string;
  storeId: string;
  outletId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  grandTotal: number;
  paymentStatus: StoreOrderPaymentStatus;
  orderStatus: StoreOrderStatus;
  notes?: string;
  createdAt: Date;
}

// ========================================
// SELF-ORDER SERVICE
// ========================================

@Injectable()
export class SelfOrderService {
  private readonly logger = new Logger(SelfOrderService.name);
  private readonly SESSION_EXPIRY_MINUTES = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Create new self-order session (when customer scans QR)
   */
  async createSession(outletId: string, tableId?: string): Promise<SelfOrderSessionInfo> {
    const sessionCode = randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.SESSION_EXPIRY_MINUTES);

    const table = tableId ? await this.prisma.table.findUnique({ where: { id: tableId } }) : null;

    const session = await this.prisma.selfOrderSession.create({
      data: {
        outletId,
        tableId,
        sessionCode,
        status: 'active',
        expiresAt,
      },
    });

    return {
      id: session.id,
      outletId: session.outletId,
      tableId: session.tableId || undefined,
      tableName: table?.name,
      sessionCode: session.sessionCode,
      status: session.status,
      customerName: session.customerName || undefined,
      language: session.language,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      items: [],
    };
  }

  /**
   * Get session by session code
   */
  async getSession(sessionCode: string): Promise<SelfOrderSessionInfo> {
    const session = await this.prisma.selfOrderSession.findFirst({
      where: { sessionCode },
      include: {
        table: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'active') {
      throw new BadRequestException('Session is no longer active');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.selfOrderSession.update({
        where: { id: session.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Session has expired');
    }

    return {
      id: session.id,
      outletId: session.outletId,
      tableId: session.tableId || undefined,
      tableName: session.table?.name,
      sessionCode: session.sessionCode,
      status: session.status,
      customerName: session.customerName || undefined,
      language: session.language,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      items: session.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.product.name,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unitPrice: Number(item.variant?.price ?? item.product.basePrice),
        modifiers: item.modifiers as unknown as SelfOrderCartItem['modifiers'],
        notes: item.notes || undefined,
        subtotal: Number(item.variant?.price ?? item.product.basePrice) * item.quantity,
      })),
    };
  }

  /**
   * Get menu for self-order
   */
  async getMenu(outletId: string): Promise<{
    categories: Array<{
      id: string;
      name: string;
      products: Array<{
        id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        basePrice: number;
        variants?: Array<{
          id: string;
          name: string;
          price: number;
        }>;
        modifierGroups?: Array<{
          id: string;
          name: string;
          isRequired: boolean;
          modifiers: Array<{
            id: string;
            name: string;
            price: number;
          }>;
        }>;
      }>;
    }>;
  }> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      include: { business: true },
    });

    if (!outlet) throw new NotFoundException('Outlet not found');

    const categories = await this.prisma.category.findMany({
      where: { businessId: outlet.businessId, isActive: true },
      include: {
        products: {
          where: { isActive: true },
          include: {
            variants: { where: { isActive: true } },
            productModifierGroups: {
              include: {
                modifierGroup: {
                  include: { modifiers: { where: { isActive: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        products: cat.products.map((prod) => ({
          id: prod.id,
          name: prod.name,
          description: prod.description || undefined,
          imageUrl: prod.imageUrl || undefined,
          basePrice: Number(prod.basePrice),
          variants: prod.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: Number(v.price),
          })),
          modifierGroups: prod.productModifierGroups.map((pmg) => ({
            id: pmg.modifierGroup.id,
            name: pmg.modifierGroup.name,
            isRequired: pmg.modifierGroup.isRequired,
            modifiers: pmg.modifierGroup.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              price: Number(m.price),
            })),
          })),
        })),
      })),
    };
  }

  /**
   * Add item to cart (creates SelfOrderItem)
   */
  async addToCart(data: AddToCartDto): Promise<SelfOrderSessionInfo> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!session || session.status !== 'active') {
      throw new BadRequestException('Invalid or expired session');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { variants: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    const modifiers = data.modifierIds
      ? await this.prisma.modifier.findMany({
          where: { id: { in: data.modifierIds } },
        })
      : [];

    const modifiersJson = modifiers.map((m) => ({
      id: m.id,
      name: m.name,
      price: Number(m.price),
    }));

    // Create SelfOrderItem
    await this.prisma.selfOrderItem.create({
      data: {
        sessionId: data.sessionId,
        productId: data.productId,
        variantId: data.variantId,
        quantity: data.quantity,
        modifiers: modifiersJson as unknown as Prisma.InputJsonValue,
        notes: data.notes,
      },
    });

    return this.getSession(session.sessionCode);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    sessionId: string,
    itemIndex: number,
    quantity: number,
  ): Promise<SelfOrderSessionInfo> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: sessionId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session || session.status !== 'active') {
      throw new BadRequestException('Invalid or expired session');
    }

    if (itemIndex < 0 || itemIndex >= session.items.length) {
      throw new BadRequestException('Invalid item index');
    }

    const item = session.items[itemIndex];

    if (quantity <= 0) {
      await this.prisma.selfOrderItem.delete({ where: { id: item.id } });
    } else {
      await this.prisma.selfOrderItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }

    return this.getSession(session.sessionCode);
  }

  /**
   * Submit order and send to KDS
   */
  async submitOrder(sessionId: string): Promise<{ orderId: string; orderNumber: string }> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        items: {
          include: { product: true, variant: true },
        },
      },
    });

    if (!session || session.status !== 'active') {
      throw new BadRequestException('Invalid or expired session');
    }

    if (session.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Generate order number
    const orderCount = await this.prisma.order.count({
      where: { outletId: session.outletId },
    });
    const orderNumber = `SO${(orderCount + 1).toString().padStart(4, '0')}`;

    // Create KDS order
    const order = await this.prisma.order.create({
      data: {
        outletId: session.outletId,
        orderNumber,
        orderType: session.tableId ? 'dine_in' : 'takeaway',
        tableId: session.tableId,
        status: 'pending',
        notes: `Self-order from ${session.table?.name || 'counter'}`,
        items: {
          create: session.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.name,
            quantity: item.quantity,
            status: 'pending',
            notes: item.notes,
          })),
        },
      },
    });

    // Update session status
    await this.prisma.selfOrderSession.update({
      where: { id: sessionId },
      data: {
        status: 'submitted',
      },
    });

    // Emit event so KDS picks up the new order
    this.eventBus.publish(
      new OrderStatusChangedEvent(order.id, session.outletId, 'none', 'pending'),
    );

    this.logger.log(
      `Self-order submitted: ${orderNumber} from ${session.table?.name || 'counter'}`,
    );

    return { orderId: order.id, orderNumber };
  }

  /**
   * Process payment for self-order
   */
  async processPayment(data: SelfOrderPaymentDto): Promise<{
    success: boolean;
    qrCode?: string;
    checkoutUrl?: string;
    expiresAt?: Date;
  }> {
    const session = await this.getSession(data.sessionId);

    if (session.status !== 'submitted') {
      throw new BadRequestException('Order not submitted yet');
    }

    // In production, integrate with payment gateway
    // For now, return mock QRIS
    const total = session.items.reduce((sum, item) => sum + item.subtotal, 0);
    const qrCode = `00020101021226610014ID.QRIS.WWW0118936008990000${total}5204539953033605802ID`;

    return {
      success: true,
      qrCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  /**
   * Confirm payment received
   */
  async confirmPayment(sessionId: string, _referenceNumber: string): Promise<void> {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.selfOrderSession.update({
      where: { id: sessionId },
      data: {
        status: 'paid',
      },
    });

    this.logger.log(`Self-order payment confirmed: ${sessionId}`);
  }

  /**
   * Expire all sessions older than SESSION_EXPIRY_MINUTES.
   * Should be called periodically (e.g., via a cron job).
   */
  async expireOldSessions(): Promise<{ expired: number }> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - this.SESSION_EXPIRY_MINUTES);

    const result = await this.prisma.selfOrderSession.updateMany({
      where: {
        status: 'active',
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old self-order sessions`);
    }

    return { expired: result.count };
  }
}

// ========================================
// ONLINE STORE SERVICE
// ========================================

@Injectable()
export class OnlineStoreService {
  private readonly logger = new Logger(OnlineStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get store by slug
   */
  async getStore(slug: string): Promise<OnlineStoreConfig | null> {
    const store = await this.prisma.onlineStore.findFirst({
      where: { slug, isActive: true },
    });

    if (!store) return null;

    return {
      id: store.id,
      businessId: store.businessId,
      storeName: store.storeName,
      slug: store.slug,
      description: store.description || undefined,
      logoUrl: store.logoUrl || undefined,
      bannerUrl: store.bannerUrl || undefined,
      themeSettings: store.themeSettings as Record<string, unknown>,
      shippingMethods: store.shippingMethods as unknown[],
      paymentMethods: store.paymentMethods as unknown[],
      isActive: store.isActive,
    };
  }

  /**
   * Get store catalog
   */
  async getCatalog(storeId: string): Promise<{
    categories: Array<{
      id: string;
      name: string;
      products: Array<{
        id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        price: number;
        inStock: boolean;
      }>;
    }>;
  }> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      include: { business: true },
    });

    if (!store) throw new NotFoundException('Store not found');

    const categories = await this.prisma.category.findMany({
      where: { businessId: store.businessId, isActive: true },
      include: {
        products: {
          where: { isActive: true },
          include: {
            stockLevels: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        products: cat.products.map((prod) => ({
          id: prod.id,
          name: prod.name,
          description: prod.description || undefined,
          imageUrl: prod.imageUrl || undefined,
          price: Number(prod.basePrice),
          inStock: prod.stockLevels.some((sl) => Number(sl.quantity) > 0),
        })),
      })),
    };
  }

  /**
   * Create store order
   */
  async createOrder(
    storeId: string,
    data: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      shippingAddress?: string;
      items: Array<{ productId: string; quantity: number }>;
      notes?: string;
      outletId: string;
    },
  ): Promise<StoreOrderInfo> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
    });

    if (!store) throw new NotFoundException('Store not found');

    // Get product details
    const productIds = data.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const orderItems = data.items.map((item) => {
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
  ): Promise<{ qrCode?: string; vaNumber?: string; expiresAt: Date }> {
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
  async getOrders(
    storeId: string,
    options?: { status?: StoreOrderStatus; limit?: number },
  ): Promise<StoreOrderInfo[]> {
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
