/**
 * Marketplace Service (Aggregator)
 *
 * Coordinates multiple marketplace integrations:
 * - GoFood (Gojek)
 * - GrabFood (Grab)
 * - ShopeeFood (Shopee)
 *
 * Features:
 * - Manages connections to marketplaces per outlet
 * - Syncs menu and inventory across all platforms
 * - Aggregates orders from all marketplaces
 * - Polls for new orders periodically
 * - Emits events for order lifecycle
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter } from 'events';
import { GoFoodGateway } from './gofood.gateway';
import { GrabFoodGateway } from './grabfood.gateway';
import { ShopeeFoodGateway } from './shopeefood.gateway';
import {
  IMarketplaceGateway,
  MarketplaceCredentials,
  MarketplaceMenuItem,
  MarketplaceOrder,
  MarketplaceOrderStatus,
  MarketplacePlatform,
} from './marketplace.types';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

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

  async onModuleInit(): Promise<void> {
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
    if (!gateway) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown platform: ${platform}`,
      );
    }

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
   * Update item price across all marketplaces
   */
  async updateItemPrice(outletId: string, itemId: string, price: number): Promise<void> {
    for (const [platform, gateway] of this.gateways) {
      const creds = this.credentials.get(`${outletId}-${platform}`);
      if (!creds) continue;

      try {
        await gateway.updateItemPrice(itemId, price);
      } catch (error) {
        this.logger.error(`Failed to update price on ${platform}: ${error}`);
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
    if (!gateway) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown platform: ${platform}`,
      );
    }

    await gateway.acceptOrder(orderId);

    this.eventEmitter.emit('marketplace.order.accepted', {
      outletId,
      platform,
      orderId,
    });
  }

  /**
   * Reject marketplace order
   */
  async rejectOrder(
    outletId: string,
    platform: MarketplacePlatform,
    orderId: string,
    reason: string,
  ): Promise<void> {
    const gateway = this.gateways.get(platform);
    if (!gateway) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown platform: ${platform}`,
      );
    }

    await gateway.rejectOrder(orderId, reason);

    this.eventEmitter.emit('marketplace.order.rejected', {
      outletId,
      platform,
      orderId,
      reason,
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
    if (!gateway) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown platform: ${platform}`,
      );
    }

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
