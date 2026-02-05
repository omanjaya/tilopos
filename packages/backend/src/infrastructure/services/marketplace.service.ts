/**
 * Marketplace Integration Module
 *
 * Integrations for:
 * - GoFood (Gojek)
 * - GrabFood (Grab)
 * - ShopeeFood (Shopee)
 *
 * Features:
 * - Menu/catalog sync
 * - Order receiving & fulfillment
 * - Inventory sync
 * - Price sync
 * - Settlement reconciliation
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter } from 'events';

// Types
export interface MarketplaceCredentials {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface MarketplaceMenuItem {
  id: string;
  externalId?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  isAvailable: boolean;
  variants?: MarketplaceVariant[];
  modifiers?: MarketplaceModifier[];
}

export interface MarketplaceVariant {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface MarketplaceModifier {
  id: string;
  groupName: string;
  name: string;
  price: number;
  isRequired: boolean;
}

export interface MarketplaceOrder {
  id: string;
  externalId: string;
  platform: MarketplacePlatform;
  status: MarketplaceOrderStatus;
  customer: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  };
  items: MarketplaceOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  isPaid: boolean;
  driverInfo?: {
    name: string;
    phone: string;
    plateNumber: string;
  };
  estimatedPickupTime?: Date;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
}

export interface MarketplaceOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
  variantName?: string;
  modifiers?: { name: string; price: number }[];
}

export type MarketplacePlatform = 'gofood' | 'grabfood' | 'shopeefood';
export type MarketplaceOrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'completed'
  | 'cancelled';

// Base Interface
export interface IMarketplaceGateway {
  platform: MarketplacePlatform;

  // Authentication
  authenticate(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>;
  refreshToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials>;

  // Menu Management
  syncMenu(items: MarketplaceMenuItem[]): Promise<void>;
  updateItemAvailability(itemId: string, isAvailable: boolean): Promise<void>;
  updateItemPrice(itemId: string, price: number): Promise<void>;

  // Order Management
  fetchNewOrders(): Promise<MarketplaceOrder[]>;
  acceptOrder(orderId: string): Promise<void>;
  rejectOrder(orderId: string, reason: string): Promise<void>;
  updateOrderStatus(orderId: string, status: MarketplaceOrderStatus): Promise<void>;

  // Settlements
  fetchSettlements(startDate: Date, endDate: Date): Promise<MarketplaceSettlement[]>;
}

export interface MarketplaceSettlement {
  id: string;
  period: { start: Date; end: Date };
  totalSales: number;
  commission: number;
  deliveryFee: number;
  adjustments: number;
  netAmount: number;
  status: 'pending' | 'settled' | 'disputed';
  settledAt?: Date;
}

// GoFood Gateway
@Injectable()
export class GoFoodGateway implements IMarketplaceGateway {
  readonly platform = 'gofood' as const;
  private readonly logger = new Logger(GoFoodGateway.name);

  async authenticate(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    this.logger.log('Authenticating with GoFood...');

    // In production, call actual GoFood OAuth endpoint
    const response = (await this.request('/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        merchant_id: credentials.merchantId,
        client_id: credentials.apiKey,
        client_secret: credentials.apiSecret,
        grant_type: 'client_credentials',
      }),
    })) as { access_token: string; refresh_token: string; expires_in: number };

    return {
      ...credentials,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
    };
  }

  async refreshToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    const response = (await this.request('/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    })) as { access_token: string; refresh_token: string; expires_in: number };

    return {
      ...credentials,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
    };
  }

  async syncMenu(items: MarketplaceMenuItem[]): Promise<void> {
    this.logger.log(`Syncing ${items.length} items to GoFood`);

    const menuData = items.map((item) => ({
      outlet_menu_id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      photo_url: item.imageUrl,
      category: item.categoryName,
      is_available: item.isAvailable,
      variants: item.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        is_available: v.isAvailable,
      })),
    }));

    await this.request('/menu/sync', {
      method: 'POST',
      body: JSON.stringify({ items: menuData }),
    });
  }

  async updateItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    await this.request(`/menu/items/${itemId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ is_available: isAvailable }),
    });
  }

  async updateItemPrice(itemId: string, price: number): Promise<void> {
    await this.request(`/menu/items/${itemId}/price`, {
      method: 'PUT',
      body: JSON.stringify({ price }),
    });
  }

  async fetchNewOrders(): Promise<MarketplaceOrder[]> {
    const response = (await this.request('/orders?status=new')) as {
      orders: Array<Record<string, unknown>>;
    };
    return (response.orders || []).map(this.mapOrder.bind(this));
  }

  async acceptOrder(orderId: string): Promise<void> {
    await this.request(`/orders/${orderId}/accept`, { method: 'POST' });
  }

  async rejectOrder(orderId: string, reason: string): Promise<void> {
    await this.request(`/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async updateOrderStatus(orderId: string, status: MarketplaceOrderStatus): Promise<void> {
    const statusMap: Record<MarketplaceOrderStatus, string> = {
      new: 'NEW',
      accepted: 'ACCEPTED',
      preparing: 'PREPARING',
      ready: 'READY_FOR_PICKUP',
      picked_up: 'PICKED_UP',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    };

    await this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: statusMap[status] }),
    });
  }

  async fetchSettlements(startDate: Date, endDate: Date): Promise<MarketplaceSettlement[]> {
    const response = (await this.request(
      `/settlements?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
    )) as { settlements: Array<Record<string, unknown>> };

    return (response.settlements || []).map((s: Record<string, unknown>) => ({
      id: String(s.id),
      period: { start: new Date(s.period_start as string), end: new Date(s.period_end as string) },
      totalSales: Number(s.total_sales || 0),
      commission: Number(s.commission || 0),
      deliveryFee: Number(s.delivery_fee || 0),
      adjustments: Number(s.adjustments || 0),
      netAmount: Number(s.net_amount || 0),
      status: (s.status as 'pending' | 'settled' | 'disputed') || 'pending',
      settledAt: s.settled_at ? new Date(s.settled_at as string) : undefined,
    }));
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Record<string, unknown>> {
    // In production, make actual HTTP request
    // This is a stub implementation
    this.logger.debug(`GoFood API: ${options.method || 'GET'} ${endpoint}`);
    return { success: true, orders: [], settlements: [] };
  }

  private mapOrder(order: Record<string, unknown>): MarketplaceOrder {
    const items = order.items as Array<Record<string, unknown>>;
    return {
      id: `gofood-${order.id}`,
      externalId: order.id as string,
      platform: 'gofood',
      status: this.mapStatus(order.status as string),
      customer: {
        name: order.customer_name as string,
        phone: order.customer_phone as string,
        address: order.delivery_address as string,
        notes: order.notes as string,
      },
      items: items.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: item.name as string,
        quantity: item.quantity as number,
        price: item.price as number,
        subtotal: item.subtotal as number,
        notes: item.notes as string,
      })),
      subtotal: order.subtotal as number,
      deliveryFee: order.delivery_fee as number,
      discount: order.discount as number,
      total: order.total as number,
      paymentMethod: order.payment_method as string,
      isPaid: true, // GoFood orders are prepaid
      createdAt: new Date(order.created_at as string),
    };
  }

  private mapStatus(status: string): MarketplaceOrderStatus {
    const map: Record<string, MarketplaceOrderStatus> = {
      NEW: 'new',
      ACCEPTED: 'accepted',
      PREPARING: 'preparing',
      READY_FOR_PICKUP: 'ready',
      PICKED_UP: 'picked_up',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    };
    return map[status] || 'new';
  }
}

// GrabFood Gateway
@Injectable()
export class GrabFoodGateway implements IMarketplaceGateway {
  readonly platform = 'grabfood' as const;
  private readonly logger = new Logger(GrabFoodGateway.name);

  async authenticate(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    this.logger.log('Authenticating with GrabFood...');

    const response = await this.request('/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: credentials.apiKey,
        client_secret: credentials.apiSecret,
        grant_type: 'client_credentials',
        scope: 'grabfood.merchant',
      }),
    });

    return {
      ...credentials,
      accessToken: response.access_token as string,
      expiresAt: new Date(Date.now() + (response.expires_in as number) * 1000),
    };
  }

  async refreshToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    return this.authenticate(credentials);
  }

  async syncMenu(items: MarketplaceMenuItem[]): Promise<void> {
    this.logger.log(`Syncing ${items.length} items to GrabFood`);

    const menuData = {
      categories: this.groupByCategory(items),
    };

    await this.request('/merchant/menu', {
      method: 'PUT',
      body: JSON.stringify(menuData),
    });
  }

  async updateItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    await this.request(`/merchant/menu/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ availableStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE' }),
    });
  }

  async updateItemPrice(itemId: string, price: number): Promise<void> {
    await this.request(`/merchant/menu/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ price: price * 100 }), // GrabFood uses cents
    });
  }

  async fetchNewOrders(): Promise<MarketplaceOrder[]> {
    const response = await this.request('/merchant/orders?status=PENDING');
    const orders = response.orders as Array<Record<string, unknown>>;
    return orders.map(this.mapOrder.bind(this));
  }

  async acceptOrder(orderId: string): Promise<void> {
    await this.request(`/merchant/orders/${orderId}/accept`, { method: 'POST' });
  }

  async rejectOrder(orderId: string, reason: string): Promise<void> {
    await this.request(`/merchant/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectCode: reason }),
    });
  }

  async updateOrderStatus(orderId: string, status: MarketplaceOrderStatus): Promise<void> {
    const statusMap: Record<string, string> = {
      preparing: 'PREPARING',
      ready: 'READY',
      completed: 'COMPLETED',
    };

    if (statusMap[status]) {
      await this.request(`/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: statusMap[status] }),
      });
    }
  }

  async fetchSettlements(startDate: Date, endDate: Date): Promise<MarketplaceSettlement[]> {
    const response = await this.request(
      `/merchant/finance/settlements?from=${startDate.toISOString()}&to=${endDate.toISOString()}`,
    );

    const settlements = response.settlements as Array<Record<string, unknown>>;
    return settlements.map((s) => ({
      id: s.settlementID as string,
      period: { start: new Date(s.startDate as string), end: new Date(s.endDate as string) },
      totalSales: (s.grossSales as number) / 100,
      commission: (s.commission as number) / 100,
      deliveryFee: 0,
      adjustments: (s.adjustments as number) / 100,
      netAmount: (s.netAmount as number) / 100,
      status: (s.status as string) === 'SETTLED' ? 'settled' : 'pending',
      settledAt: s.settledAt ? new Date(s.settledAt as string) : undefined,
    }));
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Record<string, unknown>> {
    this.logger.debug(`GrabFood API: ${options.method || 'GET'} ${endpoint}`);
    return { success: true, orders: [], settlements: [] };
  }

  private groupByCategory(items: MarketplaceMenuItem[]): Array<Record<string, unknown>> {
    const categories = new Map<string, MarketplaceMenuItem[]>();
    items.forEach((item) => {
      const cat = item.categoryName || 'Other';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(item);
    });

    return Array.from(categories.entries()).map(([name, catItems]) => ({
      name,
      items: catItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price * 100, // cents
        photoURL: item.imageUrl,
        availableStatus: item.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
      })),
    }));
  }

  private mapOrder(order: Record<string, unknown>): MarketplaceOrder {
    const items = order.items as Array<Record<string, unknown>>;
    return {
      id: `grabfood-${order.orderID}`,
      externalId: order.orderID as string,
      platform: 'grabfood',
      status: this.mapStatus(order.orderState as string),
      customer: {
        name: (order.receiver as Record<string, string>).name,
        phone: (order.receiver as Record<string, string>).phone,
        address: (order.receiver as Record<string, string>).address,
      },
      items: items.map((item: Record<string, unknown>) => ({
        id: item.itemID as string,
        name: item.name as string,
        quantity: item.quantity as number,
        price: (item.price as number) / 100,
        subtotal: (item.subtotal as number) / 100,
      })),
      subtotal: (order.subtotal as number) / 100,
      deliveryFee: (order.deliveryFee as number) / 100,
      discount: (order.discount as number) / 100,
      total: (order.total as number) / 100,
      paymentMethod: order.paymentMethod as string,
      isPaid: true,
      createdAt: new Date(order.createdAt as string),
    };
  }

  private mapStatus(status: string): MarketplaceOrderStatus {
    const map: Record<string, MarketplaceOrderStatus> = {
      PENDING: 'new',
      ACCEPTED: 'accepted',
      PREPARING: 'preparing',
      READY: 'ready',
      DRIVER_ALLOCATED: 'ready',
      COLLECTED: 'picked_up',
      DELIVERED: 'completed',
      CANCELLED: 'cancelled',
    };
    return map[status] || 'new';
  }
}

// ShopeeFood Gateway
@Injectable()
export class ShopeeFoodGateway implements IMarketplaceGateway {
  readonly platform = 'shopeefood' as const;
  private readonly logger = new Logger(ShopeeFoodGateway.name);

  async authenticate(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    this.logger.log('Authenticating with ShopeeFood...');

    const response = await this.request('/auth/access_token', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: credentials.apiKey,
        partner_secret: credentials.apiSecret,
      }),
    });

    return {
      ...credentials,
      accessToken: response.access_token as string,
      expiresAt: new Date(Date.now() + (response.expire_in as number) * 1000),
    };
  }

  async refreshToken(credentials: MarketplaceCredentials): Promise<MarketplaceCredentials> {
    return this.authenticate(credentials);
  }

  async syncMenu(items: MarketplaceMenuItem[]): Promise<void> {
    this.logger.log(`Syncing ${items.length} items to ShopeeFood`);

    for (const item of items) {
      await this.request('/dish/add_update', {
        method: 'POST',
        body: JSON.stringify({
          dish_id: item.id,
          name: item.name,
          description: item.description,
          price: item.price * 100,
          photo: item.imageUrl,
          is_available: item.isAvailable ? 1 : 0,
        }),
      });
    }
  }

  async updateItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    await this.request('/dish/update_status', {
      method: 'POST',
      body: JSON.stringify({
        dish_id: itemId,
        is_available: isAvailable ? 1 : 0,
      }),
    });
  }

  async updateItemPrice(itemId: string, price: number): Promise<void> {
    await this.request('/dish/update_price', {
      method: 'POST',
      body: JSON.stringify({
        dish_id: itemId,
        price: price * 100,
      }),
    });
  }

  async fetchNewOrders(): Promise<MarketplaceOrder[]> {
    const response = await this.request('/order/get_order_list', {
      method: 'POST',
      body: JSON.stringify({ status: 1 }), // 1 = new orders
    });

    const orders = response.orders as Array<Record<string, unknown>>;
    return orders.map(this.mapOrder.bind(this));
  }

  async acceptOrder(orderId: string): Promise<void> {
    await this.request('/order/accept', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  async rejectOrder(orderId: string, reason: string): Promise<void> {
    await this.request('/order/reject', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, reason }),
    });
  }

  async updateOrderStatus(orderId: string, status: MarketplaceOrderStatus): Promise<void> {
    const statusMap: Record<string, number> = {
      preparing: 2,
      ready: 3,
      completed: 4,
    };

    if (statusMap[status]) {
      await this.request('/order/update_status', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          status: statusMap[status],
        }),
      });
    }
  }

  async fetchSettlements(startDate: Date, endDate: Date): Promise<MarketplaceSettlement[]> {
    const response = await this.request('/finance/get_settlements', {
      method: 'POST',
      body: JSON.stringify({
        start_time: Math.floor(startDate.getTime() / 1000),
        end_time: Math.floor(endDate.getTime() / 1000),
      }),
    });

    const settlements = response.settlements as Array<Record<string, unknown>>;
    return settlements.map((s) => ({
      id: String(s.settlement_id),
      period: {
        start: new Date((s.start_time as number) * 1000),
        end: new Date((s.end_time as number) * 1000),
      },
      totalSales: (s.total_sales as number) / 100,
      commission: (s.commission as number) / 100,
      deliveryFee: (s.delivery_fee as number) / 100,
      adjustments: (s.adjustments as number) / 100,
      netAmount: (s.net_amount as number) / 100,
      status: (s.status as number) === 2 ? 'settled' : 'pending',
    }));
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Record<string, unknown>> {
    this.logger.debug(`ShopeeFood API: ${options.method || 'GET'} ${endpoint}`);
    return { success: true, orders: [], settlements: [] };
  }

  private mapOrder(order: Record<string, unknown>): MarketplaceOrder {
    const items = order.items as Array<Record<string, unknown>>;
    return {
      id: `shopeefood-${order.order_id}`,
      externalId: String(order.order_id),
      platform: 'shopeefood',
      status: this.mapStatus(order.status as number),
      customer: {
        name: order.buyer_name as string,
        phone: order.buyer_phone as string,
        address: order.delivery_address as string,
      },
      items: items.map((item: Record<string, unknown>) => ({
        id: String(item.dish_id),
        name: item.name as string,
        quantity: item.amount as number,
        price: (item.price as number) / 100,
        subtotal: (item.subtotal as number) / 100,
      })),
      subtotal: (order.subtotal as number) / 100,
      deliveryFee: (order.shipping_fee as number) / 100,
      discount: (order.discount as number) / 100,
      total: (order.total_amount as number) / 100,
      paymentMethod: 'SHOPEEPAY',
      isPaid: true,
      createdAt: new Date((order.create_time as number) * 1000),
    };
  }

  private mapStatus(status: number): MarketplaceOrderStatus {
    const map: Record<number, MarketplaceOrderStatus> = {
      1: 'new',
      2: 'accepted',
      3: 'preparing',
      4: 'ready',
      5: 'picked_up',
      6: 'completed',
      7: 'cancelled',
    };
    return map[status] || 'new';
  }
}

// Marketplace Service (Aggregator)
@Injectable()
export class MarketplaceService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceService.name);
  private gateways: Map<MarketplacePlatform, IMarketplaceGateway> = new Map();
  private credentials: Map<string, MarketplaceCredentials> = new Map(); // outletId-platform -> credentials

  constructor(
    private readonly eventEmitter: EventEmitter,
    goFoodGateway: GoFoodGateway,
    grabFoodGateway: GrabFoodGateway,
    shopeeFoodGateway: ShopeeFoodGateway,
  ) {
    this.gateways.set('gofood', goFoodGateway);
    this.gateways.set('grabfood', grabFoodGateway);
    this.gateways.set('shopeefood', shopeeFoodGateway);
  }

  async onModuleInit() {
    this.logger.log('Marketplace integrations initialized');
  }

  /**
   * Connect outlet to marketplace
   */
  async connect(
    outletId: string,
    platform: MarketplacePlatform,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceCredentials> {
    const gateway = this.gateways.get(platform);
    if (!gateway) throw new Error(`Unknown platform: ${platform}`);

    const authed = await gateway.authenticate(credentials);
    this.credentials.set(`${outletId}-${platform}`, authed);

    this.logger.log(`Connected outlet ${outletId} to ${platform}`);
    return authed;
  }

  /**
   * Disconnect outlet from marketplace
   */
  async disconnect(outletId: string, platform: MarketplacePlatform): Promise<void> {
    this.credentials.delete(`${outletId}-${platform}`);
    this.logger.log(`Disconnected outlet ${outletId} from ${platform}`);
  }

  /**
   * Sync menu to all connected marketplaces
   */
  async syncMenu(outletId: string, items: MarketplaceMenuItem[]): Promise<void> {
    for (const [platform, gateway] of this.gateways) {
      const creds = this.credentials.get(`${outletId}-${platform}`);
      if (!creds) continue;

      try {
        await gateway.syncMenu(items);
        this.logger.log(`Synced menu to ${platform} for outlet ${outletId}`);
      } catch (error) {
        this.logger.error(`Failed to sync menu to ${platform}: ${error}`);
      }
    }
  }

  /**
   * Update item availability across all marketplaces
   */
  async updateItemAvailability(
    outletId: string,
    itemId: string,
    isAvailable: boolean,
  ): Promise<void> {
    for (const [platform, gateway] of this.gateways) {
      const creds = this.credentials.get(`${outletId}-${platform}`);
      if (!creds) continue;

      try {
        await gateway.updateItemAvailability(itemId, isAvailable);
      } catch (error) {
        this.logger.error(`Failed to update availability on ${platform}: ${error}`);
      }
    }
  }

  /**
   * Fetch orders from all marketplaces
   */
  async fetchAllNewOrders(outletId: string): Promise<MarketplaceOrder[]> {
    const allOrders: MarketplaceOrder[] = [];

    for (const [platform, gateway] of this.gateways) {
      const creds = this.credentials.get(`${outletId}-${platform}`);
      if (!creds) continue;

      try {
        const orders = await gateway.fetchNewOrders();
        allOrders.push(...orders);
      } catch (error) {
        this.logger.error(`Failed to fetch orders from ${platform}: ${error}`);
      }
    }

    return allOrders;
  }

  /**
   * Accept marketplace order
   */
  async acceptOrder(
    outletId: string,
    platform: MarketplacePlatform,
    orderId: string,
  ): Promise<void> {
    const gateway = this.gateways.get(platform);
    if (!gateway) throw new Error(`Unknown platform: ${platform}`);

    await gateway.acceptOrder(orderId);

    this.eventEmitter.emit('marketplace.order.accepted', {
      outletId,
      platform,
      orderId,
    });
  }

  /**
   * Update order status on marketplace
   */
  async updateOrderStatus(
    _outletId: string,
    platform: MarketplacePlatform,
    orderId: string,
    status: MarketplaceOrderStatus,
  ): Promise<void> {
    const gateway = this.gateways.get(platform);
    if (!gateway) throw new Error(`Unknown platform: ${platform}`);

    await gateway.updateOrderStatus(orderId, status);
  }

  /**
   * Poll for new orders (scheduled)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollOrders(): Promise<void> {
    // Get unique outlet IDs from credentials
    const outletIds = new Set<string>();
    for (const key of this.credentials.keys()) {
      outletIds.add(key.split('-')[0]);
    }

    for (const outletId of outletIds) {
      const orders = await this.fetchAllNewOrders(outletId);

      for (const order of orders) {
        this.eventEmitter.emit('marketplace.order.new', {
          outletId,
          order,
        });
      }
    }
  }

  /**
   * Get connected marketplaces for outlet
   */
  getConnectedPlatforms(outletId: string): MarketplacePlatform[] {
    const platforms: MarketplacePlatform[] = [];
    for (const [key] of this.credentials) {
      if (key.startsWith(`${outletId}-`)) {
        platforms.push(key.split('-')[1] as MarketplacePlatform);
      }
    }
    return platforms;
  }
}
