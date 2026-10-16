import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface SelectiveSyncResult extends SyncResult {
  priceOverrides: number;
  skippedProducts: string[];
}

export interface FulfillResult {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string;
  shippingProvider: string;
  shippedAt: Date;
}

/** Store order states from which the merchant may ship. */
const FULFILLABLE_STATUSES = ['confirmed', 'processing'] as const;

@Injectable()
export class OnlineStoreSyncService {
  private readonly logger = new Logger(OnlineStoreSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Loads a store of the caller's business, 404 otherwise. */
  private async findOwnedStore(businessId: string, storeId: string) {
    const store = await this.prisma.onlineStore.findFirst({
      where: { id: storeId, businessId },
      select: { id: true, businessId: true, themeSettings: true },
    });
    if (!store) {
      throw new NotFoundException('Online store not found');
    }
    return store;
  }

  // ========================================================================
  // CATALOG SYNC
  // ========================================================================

  /**
   * Publishes only the listed products on the storefront. The selection is stored
   * as `publishedProductIds` and honoured by the storefront listing and checkout.
   *
   * Online-only price overrides are not supported (the storefront and checkout
   * always price from the product/variant); they are rejected instead of being
   * stored and silently ignored.
   */
  async syncCatalogSelective(
    businessId: string,
    storeId: string,
    productIds: string[],
    priceOverrides?: { productId: string; onlinePrice: number }[],
  ): Promise<SelectiveSyncResult> {
    if (priceOverrides && priceOverrides.length > 0) {
      throw new NotImplementedException({
        success: false,
        reason: 'NOT_SUPPORTED',
        message: 'Harga khusus toko online belum didukung',
      });
    }

    const store = await this.findOwnedStore(businessId, storeId);
    const requested = [...new Set(productIds)];

    const products = await this.prisma.product.findMany({
      where: { id: { in: requested }, businessId, isActive: true },
      select: { id: true, categoryId: true },
    });

    const foundIds = new Set(products.map((p) => p.id));
    const skippedProducts = requested.filter((id) => !foundIds.has(id));
    const publishedProductIds = products.map((p) => p.id);

    const currentSettings = (store.themeSettings as Record<string, unknown>) || {};
    await this.prisma.onlineStore.updateMany({
      where: { id: store.id, businessId },
      data: {
        themeSettings: {
          ...currentSettings,
          lastCatalogSync: new Date().toISOString(),
          publishedProductIds,
          productCount: publishedProductIds.length,
          categoryCount: new Set(products.map((p) => p.categoryId).filter(Boolean)).size,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Selectively published ${publishedProductIds.length} products for store ${storeId}`,
    );

    return {
      synced: publishedProductIds.length,
      failed: skippedProducts.length,
      errors: [],
      priceOverrides: 0,
      skippedProducts,
    };
  }

  // ========================================================================
  // INVENTORY SYNC
  // ========================================================================

  /**
   * Snapshots the stock levels of one outlet into the store settings.
   * Both the store and the outlet must belong to `businessId` (the caller
   * verifies the outlet with TenantAccessService).
   */
  async syncInventory(businessId: string, outletId: string, storeId: string): Promise<SyncResult> {
    const store = await this.findOwnedStore(businessId, storeId);

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { outletId, outlet: { businessId } },
      select: { productId: true, variantId: true, quantity: true },
    });

    const inventoryMap: Record<string, number> = {};
    for (const stock of stockLevels) {
      const key = stock.variantId || stock.productId;
      if (key) {
        inventoryMap[key] = Number(stock.quantity);
      }
    }

    const currentSettings = (store.themeSettings as Record<string, unknown>) || {};
    await this.prisma.onlineStore.updateMany({
      where: { id: store.id, businessId },
      data: {
        themeSettings: {
          ...currentSettings,
          lastInventorySync: new Date().toISOString(),
          inventoryOutletId: outletId,
          inventoryMap,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Synced ${stockLevels.length} inventory items for store ${storeId}`);
    return { synced: stockLevels.length, failed: 0, errors: [] };
  }

  // ========================================================================
  // STOCK CHECK
  // ========================================================================

  /** True when the outlet holds at least `quantity` of the product/variant. */
  async checkStock(
    productId: string,
    variantId: string | null,
    outletId: string,
    quantity: number,
  ): Promise<boolean> {
    const stockLevel = await this.prisma.stockLevel.findFirst({
      where: { outletId, productId, variantId: variantId || null },
      select: { quantity: true },
    });
    if (!stockLevel) {
      return false; // No stock record means out of stock
    }
    return Number(stockLevel.quantity) >= quantity;
  }

  // ========================================================================
  // SHIPPING
  // ========================================================================

  /**
   * Courier rate quotes need a courier rate provider (e.g. RajaOngkir/Biteship),
   * which is not integrated. Fail honestly instead of returning invented quotes.
   */
  async calculateShipping(
    _originCity: string,
    _destinationCity: string,
    _weight: number,
  ): Promise<never> {
    throw new NotImplementedException({
      success: false,
      reason: 'NOT_CONFIGURED',
      message: 'Perhitungan ongkir kurir belum tersedia',
    });
  }

  // ========================================================================
  // ORDER FULFILLMENT
  // ========================================================================

  /**
   * Marks a confirmed store order of `businessId` as shipped. The status change is
   * a conditional update, so concurrent fulfils cannot both succeed.
   */
  async fulfillOrder(
    businessId: string,
    orderId: string,
    trackingNumber: string,
    shippingProvider: string,
    notes?: string,
  ): Promise<FulfillResult> {
    const order = await this.prisma.storeOrder.findFirst({
      where: { id: orderId, store: { businessId } },
      select: { id: true, orderNumber: true, orderStatus: true, notes: true },
    });
    if (!order) {
      throw new NotFoundException('Store order not found');
    }

    const now = new Date();
    const { count } = await this.prisma.storeOrder.updateMany({
      where: {
        id: orderId,
        store: { businessId },
        orderStatus: { in: [...FULFILLABLE_STATUSES] },
      },
      data: {
        orderStatus: 'shipped',
        trackingNumber,
        shippingMethod: shippingProvider,
        shippedAt: now,
        notes: notes ?? order.notes,
      },
    });
    if (count === 0) {
      throw new ConflictException(
        `Order cannot be shipped from status '${order.orderStatus}' (confirm it first)`,
      );
    }

    this.logger.log(
      `Order ${order.orderNumber} fulfilled with tracking ${trackingNumber} via ${shippingProvider}`,
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'shipped',
      trackingNumber,
      shippingProvider,
      shippedAt: now,
    };
  }
}
