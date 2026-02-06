/**
 * GoFood Gateway
 *
 * Integrates with Gojek's GoFood platform for:
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
