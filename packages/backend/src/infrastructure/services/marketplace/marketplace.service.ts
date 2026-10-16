/**
 * Marketplace Service (Aggregator)
 *
 * Coordinates multiple marketplace integrations:
 * - GoFood (Gojek)
 * - GrabFood (Grab)
 * - ShopeeFood (Shopee)
 *
 * All three gateways are currently stubs (`isConfigured === false`). The aggregator refuses to
 * connect or call an unconfigured gateway (R10: no fake success) and the order poll is a no-op
 * until at least one real gateway exists.
 *
 * NOTE: connections are kept in memory only, so they do not survive a restart and are not
 * shared between replicas. Persisting encrypted credentials is required before a real gateway
 * can be enabled.
 */

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
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
  MarketplacePlatformResult,
} from './marketplace.types';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';
import { DistributedLockService } from '../../../shared/locks/distributed-lock.service';
import { BUSINESS_TZ } from '../../../shared/utils/business-time';

const POLL_LOCK_KEY = 'cron:marketplace-poll-orders';
const POLL_LOCK_TTL_SECONDS = 25;

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly gateways = new Map<MarketplacePlatform, IMarketplaceGateway>();
  /** outletId -> platform -> credentials (nested map: outlet UUIDs contain '-'). */
  private readonly credentials = new Map<
    string,
    Map<MarketplacePlatform, MarketplaceCredentials>
  >();

  constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly lock: DistributedLockService,
    goFoodGateway: GoFoodGateway,
    grabFoodGateway: GrabFoodGateway,
    shopeeFoodGateway: ShopeeFoodGateway,
  ) {
    this.gateways.set('gofood', goFoodGateway);
    this.gateways.set('grabfood', grabFoodGateway);
    this.gateways.set('shopeefood', shopeeFoodGateway);
  }

  /** True when at least one gateway has a real implementation. */
  hasConfiguredGateway(): boolean {
    for (const gateway of this.gateways.values()) {
      if (gateway.isConfigured) return true;
    }
    return false;
  }

  /**
   * Connect outlet to marketplace
   */
  async connect(
    outletId: string,
    platform: MarketplacePlatform,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceCredentials> {
    const gateway = this.getConfiguredGateway(platform);
    const authed = await gateway.authenticate(credentials);

    let perOutlet = this.credentials.get(outletId);
    if (!perOutlet) {
      perOutlet = new Map();
      this.credentials.set(outletId, perOutlet);
    }
    perOutlet.set(platform, authed);

    this.logger.log(`Connected outlet ${outletId} to ${platform}`);
    return authed;
  }

  /**
   * Disconnect outlet from marketplace
   */
  async disconnect(outletId: string, platform: MarketplacePlatform): Promise<void> {
    const perOutlet = this.credentials.get(outletId);
    perOutlet?.delete(platform);
    if (perOutlet && perOutlet.size === 0) this.credentials.delete(outletId);
    this.logger.log(`Disconnected outlet ${outletId} from ${platform}`);
  }

  /**
   * Sync menu to all connected marketplaces. Returns one result per connected platform.
   */
  async syncMenu(
    outletId: string,
    items: MarketplaceMenuItem[],
  ): Promise<MarketplacePlatformResult[]> {
    return this.forEachConnected(outletId, 'sync menu', (gateway, creds) =>
      gateway.syncMenu(creds, items),
    );
  }

  /**
   * Update item availability across all marketplaces
   */
  async updateItemAvailability(
    outletId: string,
    itemId: string,
    isAvailable: boolean,
  ): Promise<MarketplacePlatformResult[]> {
    return this.forEachConnected(outletId, 'update availability', (gateway, creds) =>
      gateway.updateItemAvailability(creds, itemId, isAvailable),
    );
  }

  /**
   * Update item price across all marketplaces
   */
  async updateItemPrice(
    outletId: string,
    itemId: string,
    price: number,
  ): Promise<MarketplacePlatformResult[]> {
    return this.forEachConnected(outletId, 'update price', (gateway, creds) =>
      gateway.updateItemPrice(creds, itemId, price),
    );
  }

  /**
   * Fetch orders from all marketplaces. Per-platform failures are reported in `results`.
   */
  async fetchAllNewOrders(
    outletId: string,
  ): Promise<{ orders: MarketplaceOrder[]; results: MarketplacePlatformResult[] }> {
    const orders: MarketplaceOrder[] = [];
    const results = await this.forEachConnected(
      outletId,
      'fetch orders',
      async (gateway, creds) => {
        orders.push(...(await gateway.fetchNewOrders(creds)));
      },
    );
    return { orders, results };
  }

  /**
   * Accept marketplace order
   */
  async acceptOrder(
    outletId: string,
    platform: MarketplacePlatform,
    orderId: string,
  ): Promise<void> {
    const { gateway, creds } = this.getConnection(outletId, platform);
    await gateway.acceptOrder(creds, orderId);

    this.eventEmitter.emit('marketplace.order.accepted', { outletId, platform, orderId });
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
    const { gateway, creds } = this.getConnection(outletId, platform);
    await gateway.rejectOrder(creds, orderId, reason);

    this.eventEmitter.emit('marketplace.order.rejected', { outletId, platform, orderId, reason });
  }

  /**
   * Update order status on marketplace
   */
  async updateOrderStatus(
    outletId: string,
    platform: MarketplacePlatform,
    orderId: string,
    status: MarketplaceOrderStatus,
  ): Promise<void> {
    const { gateway, creds } = this.getConnection(outletId, platform);
    await gateway.updateOrderStatus(creds, orderId, status);
  }

  /**
   * Poll for new orders (scheduled). No-op while every gateway is a stub; runs on one replica
   * only when enabled.
   */
  @Cron(CronExpression.EVERY_30_SECONDS, { timeZone: BUSINESS_TZ })
  async pollOrders(): Promise<void> {
    if (!this.hasConfiguredGateway() || this.credentials.size === 0) return;

    await this.lock.runExclusive(POLL_LOCK_KEY, POLL_LOCK_TTL_SECONDS, async () => {
      for (const outletId of this.credentials.keys()) {
        const { orders } = await this.fetchAllNewOrders(outletId);
        for (const order of orders) {
          this.eventEmitter.emit('marketplace.order.new', { outletId, order });
        }
      }
    });
  }

  /**
   * Get connected marketplaces for outlet
   */
  getConnectedPlatforms(outletId: string): MarketplacePlatform[] {
    return [...(this.credentials.get(outletId)?.keys() ?? [])];
  }

  private getConfiguredGateway(platform: MarketplacePlatform): IMarketplaceGateway {
    const gateway = this.gateways.get(platform);
    if (!gateway) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Unknown platform: ${platform}`);
    }
    if (!gateway.isConfigured) {
      throw new AppError(
        ErrorCode.CONFIGURATION_ERROR,
        `${platform} integration is not available yet`,
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    return gateway;
  }

  private getConnection(
    outletId: string,
    platform: MarketplacePlatform,
  ): { gateway: IMarketplaceGateway; creds: MarketplaceCredentials } {
    const gateway = this.getConfiguredGateway(platform);
    const creds = this.credentials.get(outletId)?.get(platform);
    if (!creds) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Outlet ${outletId} is not connected to ${platform}`,
      );
    }
    return { gateway, creds };
  }

  private async forEachConnected(
    outletId: string,
    action: string,
    fn: (gateway: IMarketplaceGateway, creds: MarketplaceCredentials) => Promise<void>,
  ): Promise<MarketplacePlatformResult[]> {
    const results: MarketplacePlatformResult[] = [];
    const perOutlet = this.credentials.get(outletId);
    if (!perOutlet) return results;

    for (const [platform, creds] of perOutlet) {
      const gateway = this.gateways.get(platform);
      if (!gateway?.isConfigured) {
        results.push({ platform, success: false, error: 'NOT_CONFIGURED' });
        continue;
      }
      try {
        await fn(gateway, creds);
        results.push({ platform, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to ${action} on ${platform} for outlet ${outletId}: ${message}`);
        results.push({ platform, success: false, error: message });
      }
    }
    return results;
  }
}
