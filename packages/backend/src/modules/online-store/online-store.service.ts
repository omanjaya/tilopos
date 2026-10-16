import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  NotImplementedException,
} from '@nestjs/common';
import { Prisma, StoreOrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import { DocumentNumberService } from '@shared/numbering';
import { TenantAccessService } from '@shared/tenant';
import { PRODUCT_PUBLIC_SELECT } from '@shared/constants/selects';
import { BUSINESS_TZ, addBusinessDays, startOfBusinessDay } from '@shared/utils/business-time';
import { money, multiplyMoney, sumMoney, toNumber } from '@shared/utils/money';
import { paginated, toPrismaPage, type Paginated } from '@shared/dtos/pagination-query.dto';
import {
  MAX_STOREFRONT_LINES,
  MAX_STOREFRONT_QTY,
  type StoreOrdersQueryDto,
  type StoreSettingsDto,
  type StoreShippingCalculateDto,
  type StorefrontOrderDto,
  type StorefrontStockCheckQueryDto,
} from '../../application/dtos/online-store.dto';
import {
  CatalogSyncResult,
  StoreAnalyticsResult,
  StoreInventoryItem,
  StoreInventoryResult,
  StoreSettingsResult,
  ShippingMode,
  ShippingEstimate,
  DeliveryZone,
  StorefrontData,
  StorefrontProductDetail,
  StorefrontOrderResult,
} from './interfaces';

type Db = Prisma.TransactionClient | PrismaService;
type StoreSettings = Record<string, unknown>;

/** Hard cap for public product lists (R13). */
export const MAX_STOREFRONT_PRODUCTS = 500;

/**
 * Allowed store order status transitions. Anything else is rejected (409).
 * Shipping normally goes through PUT orders/:id/fulfill (tracking number).
 */
export const STORE_ORDER_TRANSITIONS: Record<StoreOrderStatus, readonly StoreOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const NOT_CONFIGURED_DISTANCE = {
  success: false,
  reason: 'NOT_CONFIGURED',
  message:
    'Ongkir berbasis jarak belum didukung (tidak ada layanan geocoding). Atur mode ongkir flat atau gratis.',
};

const STORE_ORDER_ITEM_SELECT = {
  id: true,
  productId: true,
  variantId: true,
  productName: true,
  variantName: true,
  quantity: true,
  unitPrice: true,
  subtotal: true,
} as const;

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Current time of day in WIB as minutes since midnight. */
function businessMinutesNow(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class OnlineStoreService {
  private readonly logger = new Logger(OnlineStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly numbering: DocumentNumberService,
    private readonly tenant: TenantAccessService,
  ) {}

  // ========================================================================
  // HELPERS
  // ========================================================================

  /** Store of the caller's business, 404 otherwise (never trusts storeId alone). */
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

  /** Active store by public slug, 404 when unknown or inactive. */
  private async findActiveStoreBySlug(slug: string) {
    const store = await this.prisma.onlineStore.findUnique({
      where: { slug },
      select: {
        id: true,
        businessId: true,
        storeName: true,
        slug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        socialLinks: true,
        themeSettings: true,
        isActive: true,
      },
    });
    if (!store || !store.isActive) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  /** Active store by id (public shipping endpoints), 404 when unknown or inactive. */
  private async findActiveStoreById(storeId: string) {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, businessId: true, themeSettings: true, isActive: true },
    });
    if (!store || !store.isActive) {
      throw new NotFoundException('Online store not found');
    }
    return store;
  }

  private settingsOf(store: { themeSettings: unknown }): StoreSettings {
    const raw = store.themeSettings;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as StoreSettings) : {};
  }

  /** Product ids selected via catalog sync, or null when every active product is published. */
  private publishedIds(settings: StoreSettings): string[] | null {
    const ids = settings['publishedProductIds'];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : null;
  }

  private productScope(businessId: string, settings: StoreSettings): Prisma.ProductWhereInput {
    const published = this.publishedIds(settings);
    return {
      businessId,
      isActive: true,
      ...(published ? { id: { in: published } } : {}),
    };
  }

  /**
   * The single outlet that fulfils storefront orders (stock source):
   * `fulfillmentOutletId` from the store settings, otherwise the oldest active outlet.
   */
  private async findFulfillmentOutlet(
    db: Db,
    businessId: string,
    settings: StoreSettings,
  ): Promise<{ id: string } | null> {
    const configured = settings['fulfillmentOutletId'];
    if (typeof configured === 'string' && configured) {
      return db.outlet.findFirst({
        where: { id: configured, businessId, isActive: true },
        select: { id: true },
      });
    }
    return db.outlet.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  }

  private async requireFulfillmentOutlet(db: Db, businessId: string, settings: StoreSettings) {
    const outlet = await this.findFulfillmentOutlet(db, businessId, settings);
    if (!outlet) {
      throw new BadRequestException('No active fulfilment outlet configured for this store');
    }
    return outlet;
  }

  /** Effective shipping mode. Unset: flat rate when a fee is configured, otherwise free. */
  private shippingModeOf(settings: StoreSettings): ShippingMode {
    const mode = settings['shippingMode'];
    if (mode === 'distance' || mode === 'flat_rate' || mode === 'free') {
      return mode;
    }
    const fee = num(settings['flatRateAmount']) ?? num(settings['deliveryFee']);
    return fee !== undefined && fee > 0 ? 'flat_rate' : 'free';
  }

  private flatRateOf(settings: StoreSettings): Prisma.Decimal {
    return money(num(settings['flatRateAmount']) ?? num(settings['deliveryFee']) ?? 0);
  }

  /**
   * Server-side shipping cost (R8): never taken from the client.
   * Distance-based pricing needs a geocoding provider and fails honestly.
   */
  computeShipping(
    settings: StoreSettings,
    method: 'delivery' | 'pickup',
    subtotal: Prisma.Decimal,
  ): { mode: ShippingMode | 'pickup'; cost: Prisma.Decimal } {
    if (method === 'pickup') {
      if (settings['isPickupEnabled'] !== true) {
        throw new BadRequestException('Pengambilan di toko tidak tersedia');
      }
      return { mode: 'pickup', cost: money(0) };
    }
    if (settings['isDeliveryEnabled'] === false) {
      throw new BadRequestException('Pengiriman tidak tersedia untuk toko ini');
    }
    const mode = this.shippingModeOf(settings);
    if (mode === 'distance') {
      throw new NotImplementedException(NOT_CONFIGURED_DISTANCE);
    }
    if (mode === 'free') {
      return { mode, cost: money(0) };
    }
    const threshold = num(settings['freeDeliveryThreshold']);
    if (threshold !== undefined && threshold > 0 && subtotal.gte(threshold)) {
      return { mode, cost: money(0) };
    }
    return { mode, cost: this.flatRateOf(settings) };
  }

  private assertOpen(settings: StoreSettings, now: Date = new Date()): void {
    const start = settings['operatingHoursStart'];
    const end = settings['operatingHoursEnd'];
    if (typeof start !== 'string' || typeof end !== 'string') return;
    const from = hhmmToMinutes(start);
    const to = hhmmToMinutes(end);
    const current = businessMinutesNow(now);
    const open = from <= to ? current >= from && current < to : current >= from || current < to;
    if (!open) {
      throw new BadRequestException(`Toko sedang tutup (jam operasional ${start}-${end} WIB)`);
    }
  }

  // ========================================================================
  // CATALOG SYNC WITH STOCK CHECK
  // ========================================================================

  /**
   * Snapshots the published catalog with stock availability of the fulfilment outlet.
   */
  async syncCatalog(businessId: string, storeId: string): Promise<CatalogSyncResult> {
    const store = await this.findOwnedStore(businessId, storeId);
    const settings = this.settingsOf(store);
    const outlet = await this.findFulfillmentOutlet(this.prisma, businessId, settings);

    const products = await this.prisma.product.findMany({
      where: this.productScope(businessId, settings),
      select: {
        id: true,
        name: true,
        basePrice: true,
        categoryId: true,
        imageUrl: true,
        hasVariants: true,
        trackStock: true,
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
        stockLevels: outlet
          ? { where: { outletId: outlet.id }, select: { quantity: true } }
          : { where: { outletId: { in: [] } }, select: { quantity: true } },
      },
    });

    let synced = 0;
    let outOfStock = 0;
    const catalogEntries: Record<string, unknown>[] = [];

    for (const product of products) {
      const totalStock = product.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);
      if (!product.trackStock || totalStock > 0) {
        catalogEntries.push({
          productId: product.id,
          name: product.name,
          basePrice: toNumber(product.basePrice),
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? null,
          imageUrl: product.imageUrl,
          hasVariants: product.hasVariants,
          inStock: true,
          totalStock: product.trackStock ? totalStock : null,
          variants: product.variants.map((v) => ({
            variantId: v.id,
            name: v.name,
            price: toNumber(v.price),
          })),
        });
        synced++;
      } else {
        outOfStock++;
      }
    }

    const now = new Date().toISOString();
    await this.prisma.onlineStore.updateMany({
      where: { id: store.id, businessId },
      data: {
        themeSettings: {
          ...settings,
          lastCatalogSync: now,
          catalogEntries,
          productCount: synced,
          outOfStockCount: outOfStock,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Catalog sync for store ${storeId}: ${synced} synced, ${outOfStock} out of stock`,
    );

    return { synced, skipped: outOfStock, outOfStock, lastSyncAt: now };
  }

  // ========================================================================
  // STORE ORDERS (admin)
  // ========================================================================

  async getStoreOrders(
    businessId: string,
    slug: string,
    query: StoreOrdersQueryDto,
  ): Promise<Paginated<Record<string, unknown>>> {
    const store = await this.prisma.onlineStore.findFirst({
      where: { slug, businessId },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Store not found');

    const where: Prisma.StoreOrderWhereInput = {
      storeId: store.id,
      ...(query.status ? { orderStatus: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.storeOrder.findMany({
        where,
        include: { items: { select: STORE_ORDER_ITEM_SELECT } },
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage(query),
      }),
      this.prisma.storeOrder.count({ where }),
    ]);

    const data = rows.map((order) => ({
      ...order,
      shippingCost: toNumber(order.shippingCost),
      subtotal: toNumber(order.subtotal),
      discountAmount: toNumber(order.discountAmount),
      grandTotal: toNumber(order.grandTotal),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: toNumber(item.unitPrice),
        subtotal: toNumber(item.subtotal),
      })),
    }));
    return paginated(data, total, query);
  }

  /**
   * Moves a store order of `businessId` through the allowed transitions.
   * - confirm: creates the kitchen (KDS) order — unpaid/unconfirmed orders never reach the kitchen.
   * - cancel: releases the stock deducted at checkout and cancels the kitchen order.
   * All writes happen in one transaction behind a conditional status update.
   */
  async updateOrderStatus(businessId: string, orderId: string, status: StoreOrderStatus) {
    let kitchenOrder: { id: string; outletId: string } | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.storeOrder.findFirst({
        where: { id: orderId, store: { businessId } },
        include: { items: { select: STORE_ORDER_ITEM_SELECT } },
      });
      if (!order) throw new NotFoundException('Order not found');

      const allowed = STORE_ORDER_TRANSITIONS[order.orderStatus];
      if (!allowed.includes(status)) {
        throw new ConflictException(
          `Cannot change order status from '${order.orderStatus}' to '${status}'`,
        );
      }

      const now = new Date();
      const { count } = await tx.storeOrder.updateMany({
        where: { id: order.id, store: { businessId }, orderStatus: order.orderStatus },
        data: {
          orderStatus: status,
          ...(status === 'shipped' ? { shippedAt: now } : {}),
          ...(status === 'delivered' ? { deliveredAt: now } : {}),
          ...(status === 'cancelled' ? { cancelledAt: now } : {}),
        },
      });
      if (count === 0) {
        throw new ConflictException('Order was modified concurrently, please retry');
      }

      const kitchenNotePrefix = `Online order ${order.orderNumber} -`;

      if (status === 'confirmed') {
        const orderNumber = await this.numbering.next(tx, businessId, 'ORD');
        kitchenOrder = await tx.order.create({
          data: {
            outletId: order.outletId,
            orderNumber,
            orderType: order.shippingMethod === 'pickup' ? 'takeaway' : 'delivery',
            status: 'pending',
            notes: `${kitchenNotePrefix} ${order.customerName}`,
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                productName: item.variantName
                  ? `${item.productName} (${item.variantName})`
                  : item.productName,
                quantity: item.quantity,
                status: 'pending',
              })),
            },
          },
          select: { id: true, outletId: true },
        });
      }

      if (status === 'cancelled') {
        await this.releaseStock(tx, businessId, order.outletId, order.items);
        await tx.order.updateMany({
          where: {
            outletId: order.outletId,
            notes: { startsWith: kitchenNotePrefix },
            status: { in: ['pending', 'confirmed', 'preparing'] },
          },
          data: { status: 'cancelled' },
        });
      }

      return tx.storeOrder.findFirstOrThrow({
        where: { id: order.id, store: { businessId } },
      });
    });

    const created = kitchenOrder as { id: string; outletId: string } | null;
    if (created) {
      this.eventBus.publish(
        new OrderStatusChangedEvent(created.id, created.outletId, '', 'pending'),
      );
    }

    return {
      ...updated,
      shippingCost: toNumber(updated.shippingCost),
      subtotal: toNumber(updated.subtotal),
      discountAmount: toNumber(updated.discountAmount),
      grandTotal: toNumber(updated.grandTotal),
    };
  }

  /** Returns checkout stock deductions of stock-tracked products to the outlet. */
  private async releaseStock(
    tx: Prisma.TransactionClient,
    businessId: string,
    outletId: string,
    items: { productId: string | null; variantId: string | null; quantity: number }[],
  ): Promise<void> {
    const productIds = [
      ...new Set(items.map((i) => i.productId).filter((id): id is string => !!id)),
    ];
    if (productIds.length === 0) return;
    const tracked = await tx.product.findMany({
      where: { id: { in: productIds }, businessId, trackStock: true },
      select: { id: true },
    });
    const trackedIds = new Set(tracked.map((p) => p.id));
    for (const item of items) {
      if (!item.productId || !trackedIds.has(item.productId)) continue;
      await tx.stockLevel.updateMany({
        where: { outletId, productId: item.productId, variantId: item.variantId },
        data: { quantity: { increment: item.quantity } },
      });
    }
  }

  // ========================================================================
  // STORE ANALYTICS
  // ========================================================================

  /**
   * Store analytics computed with aggregate queries. Revenue and popular products
   * exclude cancelled orders.
   */
  async getStoreAnalytics(businessId: string, storeId: string): Promise<StoreAnalyticsResult> {
    const store = await this.findOwnedStore(businessId, storeId);
    const notCancelled: Prisma.StoreOrderWhereInput = {
      storeId: store.id,
      orderStatus: { not: 'cancelled' },
    };
    const sevenDaysAgo = addBusinessDays(startOfBusinessDay(), -6);

    const [byStatus, revenue, popular, recentOrders] = await Promise.all([
      this.prisma.storeOrder.groupBy({
        by: ['orderStatus'],
        where: { storeId: store.id },
        _count: { _all: true },
      }),
      this.prisma.storeOrder.aggregate({
        where: notCancelled,
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),
      this.prisma.storeOrderItem.groupBy({
        by: ['productId', 'productName'],
        where: { storeOrder: notCancelled },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      this.prisma.storeOrder.count({
        where: { storeId: store.id, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    let totalOrders = 0;
    for (const row of byStatus) {
      ordersByStatus[row.orderStatus] = row._count._all;
      totalOrders += row._count._all;
    }

    const totalRevenue = money(revenue._sum.grandTotal);
    const paidCount = revenue._count._all;
    const avgOrderValue =
      paidCount > 0 ? totalRevenue.dividedBy(paidCount).toDecimalPlaces(2).toNumber() : 0;

    return {
      totalOrders,
      totalRevenue: totalRevenue.toNumber(),
      avgOrderValue,
      popularProducts: popular.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        totalQuantity: p._sum.quantity ?? 0,
        totalRevenue: toNumber(p._sum.subtotal),
      })),
      ordersByStatus,
      recentOrders,
    };
  }

  // ========================================================================
  // STORE INVENTORY
  // ========================================================================

  /**
   * Inventory status of the published products at the store's fulfilment outlet
   * (the same outlet checkout deducts from).
   */
  async getStoreInventory(businessId: string, storeId: string): Promise<StoreInventoryResult> {
    const store = await this.findOwnedStore(businessId, storeId);
    const settings = this.settingsOf(store);
    const outlet = await this.findFulfillmentOutlet(this.prisma, businessId, settings);
    const outletFilter = outlet ? outlet.id : { in: [] as string[] };

    const products = await this.prisma.product.findMany({
      where: this.productScope(businessId, settings),
      select: {
        id: true,
        name: true,
        hasVariants: true,
        trackStock: true,
        variants: { where: { isActive: true }, select: { id: true, name: true } },
        stockLevels: {
          where: { outletId: outletFilter },
          select: { quantity: true, lowStockAlert: true, variantId: true },
        },
      },
      take: MAX_STOREFRONT_PRODUCTS,
      orderBy: { name: 'asc' },
    });

    const statusOf = (
      tracked: boolean,
      qty: number,
      alert: number,
    ): StoreInventoryItem['status'] => {
      if (!tracked) return 'in_stock';
      if (qty <= 0) return 'out_of_stock';
      if (qty <= alert) return 'low_stock';
      return 'in_stock';
    };

    const items: StoreInventoryItem[] = [];
    for (const product of products) {
      if (product.hasVariants && product.variants.length > 0) {
        for (const variant of product.variants) {
          const stockLevel = product.stockLevels.find((sl) => sl.variantId === variant.id);
          const qty = stockLevel ? Number(stockLevel.quantity) : 0;
          const alert = stockLevel?.lowStockAlert ?? 10;
          items.push({
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            quantity: qty,
            lowStockAlert: alert,
            status: statusOf(product.trackStock, qty, alert),
          });
        }
      } else {
        const stockLevel = product.stockLevels.find((sl) => sl.variantId === null);
        const qty = stockLevel ? Number(stockLevel.quantity) : 0;
        const alert = stockLevel?.lowStockAlert ?? 10;
        items.push({
          productId: product.id,
          variantId: null,
          productName: product.name,
          variantName: null,
          quantity: qty,
          lowStockAlert: alert,
          status: statusOf(product.trackStock, qty, alert),
        });
      }
    }

    return {
      items,
      summary: {
        total: items.length,
        inStock: items.filter((i) => i.status === 'in_stock').length,
        lowStock: items.filter((i) => i.status === 'low_stock').length,
        outOfStock: items.filter((i) => i.status === 'out_of_stock').length,
      },
    };
  }

  // ========================================================================
  // STORE SETTINGS
  // ========================================================================

  /** Updates store settings; every setting is persisted and enforced at checkout. */
  async updateStoreSettings(
    businessId: string,
    storeId: string,
    dto: StoreSettingsDto,
  ): Promise<StoreSettingsResult> {
    const store = await this.findOwnedStore(businessId, storeId);
    if (dto.fulfillmentOutletId) {
      await this.tenant.assertOwned('outlet', dto.fulfillmentOutletId, businessId);
    }

    const merged: StoreSettings = { ...this.settingsOf(store) };
    const fields: (keyof StoreSettingsDto)[] = [
      'deliveryRadius',
      'minOrderAmount',
      'deliveryFee',
      'freeDeliveryThreshold',
      'isDeliveryEnabled',
      'isPickupEnabled',
      'operatingHoursStart',
      'operatingHoursEnd',
      'shippingMode',
      'flatRateAmount',
      'fulfillmentOutletId',
    ];
    for (const field of fields) {
      if (dto[field] !== undefined) {
        merged[field] = dto[field];
      }
    }

    const updated = await this.prisma.onlineStore.update({
      where: { id: store.id },
      data: { themeSettings: merged as Prisma.InputJsonValue },
      select: { id: true, updatedAt: true },
    });

    this.logger.log(`Store settings updated for store ${storeId}`);
    return { storeId: updated.id, settings: merged, updatedAt: updated.updatedAt };
  }

  // ========================================================================
  // SHIPPING
  // ========================================================================

  /** Shipping quote from the store's own settings (public). */
  async calculateShipping(
    storeId: string,
    dto: StoreShippingCalculateDto,
  ): Promise<ShippingEstimate> {
    const store = await this.findActiveStoreById(storeId);
    const settings = this.settingsOf(store);
    const { mode, cost } = this.computeShipping(settings, 'delivery', money(dto.subtotal ?? 0));
    const amount = toNumber(cost);
    return {
      shippingMode: mode as ShippingMode,
      cost: amount,
      estimatedDays: 1,
      distanceKm: null,
      description:
        amount === 0 ? 'Gratis ongkir' : `Ongkir flat rate: Rp ${amount.toLocaleString('id-ID')}`,
    };
  }

  /** Delivery zones derived from the store settings (public). */
  async getDeliveryZones(storeId: string): Promise<{
    storeId: string;
    shippingMode: ShippingMode;
    zones: DeliveryZone[];
  }> {
    const store = await this.findActiveStoreById(storeId);
    const settings = this.settingsOf(store);
    const shippingMode = this.shippingModeOf(settings);

    if (shippingMode === 'distance') {
      // Distance pricing is not supported: no invented zones.
      return { storeId, shippingMode, zones: [] };
    }
    const cost = shippingMode === 'free' ? 0 : toNumber(this.flatRateOf(settings));
    return {
      storeId,
      shippingMode,
      zones: [
        {
          name: shippingMode === 'free' ? 'Semua Area' : 'Flat Rate',
          minDistanceKm: 0,
          maxDistanceKm: 9999,
          cost,
          estimatedDays: 1,
        },
      ],
    };
  }

  // ========================================================================
  // STOREFRONT PUBLIC API
  // ========================================================================

  /** Legacy public storefront (GET s/:slug): public projections only, no cost price. */
  async getPublicStore(slug: string) {
    const store = await this.findActiveStoreBySlug(slug);
    const settings = this.settingsOf(store);
    const products = await this.prisma.product.findMany({
      where: this.productScope(store.businessId, settings),
      select: {
        ...PRODUCT_PUBLIC_SELECT,
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
      },
      orderBy: { name: 'asc' },
      take: MAX_STOREFRONT_PRODUCTS,
    });

    return {
      store: {
        id: store.id,
        storeName: store.storeName,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        socialLinks: store.socialLinks,
        isActive: store.isActive,
      },
      products: products.map((p) => ({
        ...p,
        basePrice: toNumber(p.basePrice),
        variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: toNumber(v.price) })),
      })),
    };
  }

  /**
   * Public storefront data. Stock availability is computed for the fulfilment outlet;
   * the product list is capped at MAX_STOREFRONT_PRODUCTS.
   */
  async getStorefrontData(slug: string): Promise<StorefrontData> {
    const store = await this.findActiveStoreBySlug(slug);
    const settings = this.settingsOf(store);
    const outlet = await this.findFulfillmentOutlet(this.prisma, store.businessId, settings);
    const outletFilter = outlet ? outlet.id : { in: [] as string[] };

    const products = await this.prisma.product.findMany({
      where: this.productScope(store.businessId, settings),
      select: {
        ...PRODUCT_PUBLIC_SELECT,
        trackStock: true,
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
        category: { select: { id: true, name: true, imageUrl: true } },
        stockLevels: { where: { outletId: outletFilter }, select: { quantity: true } },
      },
      orderBy: { name: 'asc' },
      take: MAX_STOREFRONT_PRODUCTS,
    });

    const categoryMap = new Map<
      string,
      { id: string; name: string; imageUrl: string | null; productCount: number }
    >();
    for (const product of products) {
      const catId = product.categoryId || 'uncategorized';
      const existing = categoryMap.get(catId);
      if (existing) {
        existing.productCount++;
      } else {
        categoryMap.set(catId, {
          id: catId,
          name: product.category?.name || 'Uncategorized',
          imageUrl: product.category?.imageUrl || null,
          productCount: 1,
        });
      }
    }

    return {
      store: {
        id: store.id,
        storeName: store.storeName,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        socialLinks: store.socialLinks,
        isDeliveryEnabled: (settings['isDeliveryEnabled'] as boolean) ?? true,
        isPickupEnabled: (settings['isPickupEnabled'] as boolean) ?? false,
      },
      categories: Array.from(categoryMap.values()),
      products: products.map((product) => {
        const totalStock = product.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: toNumber(product.basePrice),
          imageUrl: product.imageUrl,
          categoryId: product.categoryId,
          categoryName: product.category?.name || null,
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: toNumber(v.price),
          })),
          inStock: !product.trackStock || totalStock > 0,
        };
      }),
    };
  }

  /** Public product detail (no cost price). */
  async getStorefrontProduct(slug: string, productId: string): Promise<StorefrontProductDetail> {
    const store = await this.findActiveStoreBySlug(slug);
    const settings = this.settingsOf(store);
    const outlet = await this.findFulfillmentOutlet(this.prisma, store.businessId, settings);
    const outletFilter = outlet ? outlet.id : { in: [] as string[] };

    const product = await this.prisma.product.findFirst({
      where: { ...this.productScope(store.businessId, settings), AND: [{ id: productId }] },
      select: {
        ...PRODUCT_PUBLIC_SELECT,
        trackStock: true,
        variants: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, price: true },
        },
        category: { select: { id: true, name: true } },
        productModifierGroups: {
          select: {
            modifierGroup: {
              select: {
                id: true,
                name: true,
                isRequired: true,
                selectionType: true,
                minSelection: true,
                maxSelection: true,
                modifiers: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true, name: true, price: true },
                },
              },
            },
          },
        },
        stockLevels: { where: { outletId: outletFilter }, select: { quantity: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const totalStock = product.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: toNumber(product.basePrice),
      imageUrl: product.imageUrl,
      categoryId: product.categoryId,
      categoryName: product.category?.name || null,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: toNumber(v.price),
      })),
      modifierGroups: product.productModifierGroups.map((pmg) => ({
        id: pmg.modifierGroup.id,
        name: pmg.modifierGroup.name,
        isRequired: pmg.modifierGroup.isRequired,
        selectionType: pmg.modifierGroup.selectionType,
        minSelection: pmg.modifierGroup.minSelection,
        maxSelection: pmg.modifierGroup.maxSelection,
        modifiers: pmg.modifierGroup.modifiers.map((m) => ({
          id: m.id,
          name: m.name,
          price: toNumber(m.price),
        })),
      })),
      inStock: !product.trackStock || totalStock > 0,
      totalStock: product.trackStock ? totalStock : null,
    };
  }

  /** Public stock check against the store's fulfilment outlet. */
  async checkStorefrontStock(slug: string, query: StorefrontStockCheckQueryDto) {
    const store = await this.findActiveStoreBySlug(slug);
    const settings = this.settingsOf(store);
    const product = await this.prisma.product.findFirst({
      where: { ...this.productScope(store.businessId, settings), AND: [{ id: query.productId }] },
      select: { id: true, trackStock: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    let inStock = true;
    if (product.trackStock) {
      const outlet = await this.findFulfillmentOutlet(this.prisma, store.businessId, settings);
      const level = outlet
        ? await this.prisma.stockLevel.findFirst({
            where: {
              outletId: outlet.id,
              productId: product.id,
              variantId: query.variantId ?? null,
            },
            select: { quantity: true },
          })
        : null;
      inStock = !!level && Number(level.quantity) >= query.quantity;
    }
    return {
      productId: query.productId,
      variantId: query.variantId ?? null,
      quantity: query.quantity,
      inStock,
    };
  }

  /**
   * Public checkout (the only storefront order path).
   *
   * Prices and shipping come from the server. Stock is deducted from the single
   * fulfilment outlet with a conditional decrement (quantity >= n) in the same
   * transaction that creates the order, so a failed decrement creates nothing.
   * The kitchen order is created when the merchant confirms the order.
   */
  async createStorefrontOrder(
    slug: string,
    orderData: StorefrontOrderDto,
  ): Promise<StorefrontOrderResult> {
    const items = orderData.items ?? [];
    if (items.length === 0 || items.length > MAX_STOREFRONT_LINES) {
      throw new BadRequestException('Order must contain between 1 and 50 items');
    }
    for (const item of items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_STOREFRONT_QTY
      ) {
        throw new BadRequestException('Quantity must be a positive integer');
      }
    }

    const store = await this.findActiveStoreBySlug(slug);
    const settings = this.settingsOf(store);
    this.assertOpen(settings);

    // Merge duplicate lines so each (product, variant) is priced and deducted once.
    const lines = new Map<
      string,
      { productId: string; variantId: string | null; quantity: number }
    >();
    for (const item of items) {
      const variantId = item.variantId || null;
      const key = `${item.productId}:${variantId ?? ''}`;
      const existing = lines.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        lines.set(key, { productId: item.productId, variantId, quantity: item.quantity });
      }
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        ...this.productScope(store.businessId, settings),
        AND: [{ id: { in: productIds } }],
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        trackStock: true,
        variants: { where: { isActive: true }, select: { id: true, name: true, price: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = [...lines.values()].map((line) => {
      const product = productMap.get(line.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${line.productId}`);
      }
      let unitPrice = money(product.basePrice);
      let variantName: string | null = null;
      if (line.variantId) {
        const variant = product.variants.find((v) => v.id === line.variantId);
        if (!variant) {
          throw new NotFoundException(`Variant not found: ${line.variantId}`);
        }
        unitPrice = money(variant.price);
        variantName = variant.name;
      }
      return {
        productId: product.id,
        variantId: line.variantId,
        productName: product.name,
        variantName,
        quantity: line.quantity,
        trackStock: product.trackStock,
        unitPrice,
        subtotal: multiplyMoney(unitPrice, line.quantity),
      };
    });

    const subtotal = sumMoney(orderItems.map((i) => i.subtotal));
    const minOrder = num(settings['minOrderAmount']);
    if (minOrder !== undefined && subtotal.lt(minOrder)) {
      throw new BadRequestException(`Minimal pembelian Rp ${minOrder.toLocaleString('id-ID')}`);
    }

    const shippingMethod = orderData.shippingMethod ?? 'delivery';
    if (shippingMethod === 'delivery' && !orderData.shippingAddress?.trim()) {
      throw new BadRequestException('Alamat pengiriman wajib diisi');
    }
    const { cost: shippingCost } = this.computeShipping(settings, shippingMethod, subtotal);
    const grandTotal = subtotal.plus(shippingCost);

    const outlet = await this.requireFulfillmentOutlet(this.prisma, store.businessId, settings);

    const storeOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        if (!item.trackStock) continue;
        const { count } = await tx.stockLevel.updateMany({
          where: {
            outletId: outlet.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (count === 0) {
          throw new ConflictException(`Stok ${item.productName} tidak mencukupi`);
        }
      }

      const orderNumber = await this.numbering.next(tx, store.businessId, 'WEB');
      return tx.storeOrder.create({
        data: {
          storeId: store.id,
          outletId: outlet.id,
          orderNumber,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerEmail: orderData.customerEmail || null,
          shippingAddress: shippingMethod === 'delivery' ? orderData.shippingAddress || null : null,
          shippingMethod,
          notes: orderData.notes || null,
          subtotal,
          shippingCost,
          grandTotal,
          items: {
            create: orderItems.map((i) => ({
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
        select: { id: true, orderNumber: true, orderStatus: true, createdAt: true },
      });
    });

    this.logger.log(`Storefront order created: ${storeOrder.orderNumber} for store ${slug}`);

    return {
      orderId: storeOrder.id,
      orderNumber: storeOrder.orderNumber,
      subtotal: toNumber(subtotal),
      shippingCost: toNumber(shippingCost),
      grandTotal: toNumber(grandTotal),
      status: storeOrder.orderStatus,
      createdAt: storeOrder.createdAt,
    };
  }
}
