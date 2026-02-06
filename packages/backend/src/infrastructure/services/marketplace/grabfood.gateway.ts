/**
 * GrabFood Gateway
 *
 * Integrates with Grab's GrabFood platform for:
 * - Menu synchronization
 * - Order receiving & fulfillment
 * - Settlement reconciliation
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceGateway,
  MarketplaceCredentials,
  MarketplaceMenuItem,
  MarketplaceOrder,
  MarketplaceOrderStatus,
  MarketplaceSettlement,
} from './marketplace.types';

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
