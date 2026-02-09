import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import {
  CatalogSyncResult,
  StoreAnalyticsResult,
  StoreInventoryItem,
  StoreInventoryResult,
  StoreSettingsInput,
  StoreSettingsResult,
  ShippingMode,
  ShippingEstimate,
  DeliveryZone,
  StorefrontData,
  StorefrontProductDetail,
  StorefrontOrderInput,
  StorefrontOrderResult,
} from './interfaces';

@Injectable()
export class OnlineStoreService {
  private readonly logger = new Logger(OnlineStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  // ========================================================================
  // CATALOG SYNC WITH STOCK CHECK
  // ========================================================================

  /**
   * Syncs products from main catalog to online store catalog,
   * checking stock availability for each product.
   */
  async syncCatalog(businessId: string, storeId: string): Promise<CatalogSyncResult> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, businessId: true, themeSettings: true },
    });

    if (!store) {
      throw new NotFoundException('Online store not found');
    }

    if (store.businessId !== businessId) {
      throw new BadRequestException('Store does not belong to this business');
    }

    // Fetch all active products
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: { select: { id: true, name: true } },
        stockLevels: {
          select: { quantity: true, outletId: true },
        },
      },
    });

    let synced = 0;
    let skipped = 0;
    let outOfStock = 0;

    const catalogEntries: Record<string, unknown>[] = [];

    for (const product of products) {
      // Check total stock across all outlets
      const totalStock = product.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);

      if (!product.trackStock || totalStock > 0) {
        catalogEntries.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          basePrice: Number(product.basePrice),
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? null,
          imageUrl: product.imageUrl,
          hasVariants: product.hasVariants,
          inStock: !product.trackStock || totalStock > 0,
          totalStock: product.trackStock ? totalStock : null,
          variants: product.variants.map((v) => ({
            variantId: v.id,
            name: v.name,
            price: Number(v.price),
            sku: v.sku,
          })),
        });
        synced++;
      } else {
        outOfStock++;
        skipped++;
      }
    }

    const currentSettings = (store.themeSettings as Record<string, unknown>) || {};
    const now = new Date().toISOString();

    await this.prisma.onlineStore.update({
      where: { id: storeId },
      data: {
        themeSettings: {
          ...currentSettings,
          lastCatalogSync: now,
          catalogEntries,
          productCount: synced,
          outOfStockCount: outOfStock,
        } as never,
      },
    });

    this.logger.log(
      `Catalog sync for store ${storeId}: ${synced} synced, ${skipped} skipped, ${outOfStock} out of stock`,
    );

    return {
      synced,
      skipped,
      outOfStock,
      lastSyncAt: now,
    };
  }

  // ========================================================================
  // STORE ANALYTICS
  // ========================================================================

  /**
   * Returns store analytics: total orders, revenue, avg order value, popular products.
   */
  async getStoreAnalytics(businessId: string, storeId: string): Promise<StoreAnalyticsResult> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, businessId: true },
    });

    if (!store) {
      throw new NotFoundException('Online store not found');
    }

    if (store.businessId !== businessId) {
      throw new BadRequestException('Store does not belong to this business');
    }

    // Get all store orders
    const orders = await this.prisma.storeOrder.findMany({
      where: { storeId },
      include: {
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            subtotal: true,
          },
        },
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Count orders by status
    const ordersByStatus: Record<string, number> = {};
    for (const order of orders) {
      const status = order.orderStatus;
      ordersByStatus[status] = (ordersByStatus[status] ?? 0) + 1;
    }

    // Popular products
    const productSales = new Map<
      string,
      { productId: string | null; productName: string; totalQuantity: number; totalRevenue: number }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productId ?? item.productName;
        const existing = productSales.get(key) ?? {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalRevenue: 0,
        };
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += Number(item.subtotal);
        productSales.set(key, existing);
      }
    }

    const popularProducts = Array.from(productSales.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // Recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = orders.filter((o) => o.createdAt >= sevenDaysAgo).length;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      popularProducts,
      ordersByStatus,
      recentOrders,
    };
  }

  // ========================================================================
  // STORE INVENTORY
  // ========================================================================

  /**
   * Returns inventory status for store products (in stock, low stock, out of stock).
   */
  async getStoreInventory(businessId: string, storeId: string): Promise<StoreInventoryResult> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, businessId: true },
    });

    if (!store) {
      throw new NotFoundException('Online store not found');
    }

    if (store.businessId !== businessId) {
      throw new BadRequestException('Store does not belong to this business');
    }

    // Get all active products with stock levels
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        stockLevels: {
          select: {
            quantity: true,
            lowStockAlert: true,
            variantId: true,
          },
        },
      },
    });

    const items: StoreInventoryItem[] = [];

    for (const product of products) {
      if (product.hasVariants && product.variants.length > 0) {
        // Report per variant
        for (const variant of product.variants) {
          const stockLevel = product.stockLevels.find((sl) => sl.variantId === variant.id);
          const qty = stockLevel ? Number(stockLevel.quantity) : 0;
          const alert = stockLevel?.lowStockAlert ?? 10;

          let status: 'in_stock' | 'low_stock' | 'out_of_stock';
          if (qty <= 0) {
            status = 'out_of_stock';
          } else if (qty <= alert) {
            status = 'low_stock';
          } else {
            status = 'in_stock';
          }

          items.push({
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            quantity: qty,
            lowStockAlert: alert,
            status,
          });
        }
      } else {
        // Report at product level
        const totalQty = product.stockLevels
          .filter((sl) => sl.variantId === null)
          .reduce((sum, sl) => sum + Number(sl.quantity), 0);
        const alert = product.stockLevels.find((sl) => sl.variantId === null)?.lowStockAlert ?? 10;

        let status: 'in_stock' | 'low_stock' | 'out_of_stock';
        if (!product.trackStock) {
          status = 'in_stock';
        } else if (totalQty <= 0) {
          status = 'out_of_stock';
        } else if (totalQty <= alert) {
          status = 'low_stock';
        } else {
          status = 'in_stock';
        }

        items.push({
          productId: product.id,
          variantId: null,
          productName: product.name,
          variantName: null,
          quantity: totalQty,
          lowStockAlert: alert,
          status,
        });
      }
    }

    const summary = {
      total: items.length,
      inStock: items.filter((i) => i.status === 'in_stock').length,
      lowStock: items.filter((i) => i.status === 'low_stock').length,
      outOfStock: items.filter((i) => i.status === 'out_of_stock').length,
    };

    return { items, summary };
  }

  // ========================================================================
  // STORE SETTINGS
  // ========================================================================

  /**
   * Update store settings (delivery radius, min order, fees, etc.)
   */
  async updateStoreSettings(
    businessId: string,
    storeId: string,
    settings: StoreSettingsInput,
  ): Promise<StoreSettingsResult> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, businessId: true, themeSettings: true },
    });

    if (!store) {
      throw new NotFoundException('Online store not found');
    }

    if (store.businessId !== businessId) {
      throw new BadRequestException('Store does not belong to this business');
    }

    const currentSettings = (store.themeSettings as Record<string, unknown>) || {};

    const mergedSettings: Record<string, unknown> = {
      ...currentSettings,
    };

    // Only update provided settings
    if (settings.deliveryRadius !== undefined) {
      mergedSettings['deliveryRadius'] = settings.deliveryRadius;
    }
    if (settings.minOrderAmount !== undefined) {
      mergedSettings['minOrderAmount'] = settings.minOrderAmount;
    }
    if (settings.deliveryFee !== undefined) {
      mergedSettings['deliveryFee'] = settings.deliveryFee;
    }
    if (settings.freeDeliveryThreshold !== undefined) {
      mergedSettings['freeDeliveryThreshold'] = settings.freeDeliveryThreshold;
    }
    if (settings.isDeliveryEnabled !== undefined) {
      mergedSettings['isDeliveryEnabled'] = settings.isDeliveryEnabled;
    }
    if (settings.isPickupEnabled !== undefined) {
      mergedSettings['isPickupEnabled'] = settings.isPickupEnabled;
    }
    if (settings.operatingHoursStart !== undefined) {
      mergedSettings['operatingHoursStart'] = settings.operatingHoursStart;
    }
    if (settings.operatingHoursEnd !== undefined) {
      mergedSettings['operatingHoursEnd'] = settings.operatingHoursEnd;
    }

    const updated = await this.prisma.onlineStore.update({
      where: { id: storeId },
      data: {
        themeSettings: mergedSettings as never,
      },
    });

    this.logger.log(`Store settings updated for store ${storeId}`);

    return {
      storeId: updated.id,
      settings: mergedSettings,
      updatedAt: updated.updatedAt,
    };
  }

  // ========================================================================
  // SHIPPING CALCULATOR (distance-based with store settings support)
  // ========================================================================

  /** Default distance-based delivery zones */
  private readonly defaultDeliveryZones: DeliveryZone[] = [
    { name: 'Gratis Ongkir', minDistanceKm: 0, maxDistanceKm: 5, cost: 0, estimatedDays: 0 },
    { name: 'Zona 1', minDistanceKm: 5, maxDistanceKm: 10, cost: 10000, estimatedDays: 1 },
    { name: 'Zona 2', minDistanceKm: 10, maxDistanceKm: 20, cost: 20000, estimatedDays: 1 },
    { name: 'Zona 3', minDistanceKm: 20, maxDistanceKm: Infinity, cost: 35000, estimatedDays: 2 },
  ];

  /**
   * Calculate shipping cost for a store order.
   *
   * Supports three shipping modes from store settings:
   * - 'distance': Flat rate tiers based on distance (<5km free, 5-10km Rp 10k, 10-20km Rp 20k, >20km Rp 35k)
   * - 'flat_rate': Fixed shipping cost regardless of distance
   * - 'free': Free shipping for all orders
   *
   * @param storeId - The store ID
   * @param destination - Destination address/city
   * @param weight - Total weight in grams
   */
  async calculateShipping(
    storeId: string,
    destination: string,
    weight: number,
  ): Promise<ShippingEstimate> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, themeSettings: true },
    });

    if (!store) {
      throw new NotFoundException('Online store not found');
    }

    const settings = (store.themeSettings as Record<string, unknown>) || {};
    const shippingMode = (settings['shippingMode'] as ShippingMode) || 'distance';

    // Free shipping mode
    if (shippingMode === 'free') {
      return {
        shippingMode: 'free',
        cost: 0,
        estimatedDays: 1,
        distanceKm: null,
        description: 'Gratis ongkir',
      };
    }

    // Flat rate mode
    if (shippingMode === 'flat_rate') {
      const flatRate =
        typeof settings['flatRateAmount'] === 'number'
          ? settings['flatRateAmount']
          : typeof settings['deliveryFee'] === 'number'
            ? settings['deliveryFee']
            : 15000;

      return {
        shippingMode: 'flat_rate',
        cost: flatRate,
        estimatedDays: 1,
        distanceKm: null,
        description: `Ongkir flat rate: Rp ${flatRate.toLocaleString('id-ID')}`,
      };
    }

    // Distance-based mode (default)
    // Simple distance estimation from destination string length as a proxy
    // In production, this would use a geocoding/distance API
    const distanceKm = this.estimateDistance(destination, weight);

    const zone =
      this.defaultDeliveryZones.find(
        (z) => distanceKm >= z.minDistanceKm && distanceKm < z.maxDistanceKm,
      ) ?? this.defaultDeliveryZones[this.defaultDeliveryZones.length - 1];

    return {
      shippingMode: 'distance',
      cost: zone.cost,
      estimatedDays: zone.estimatedDays,
      distanceKm,
      description:
        zone.cost === 0
          ? 'Gratis ongkir (jarak < 5km)'
          : `Ongkir ${zone.name}: Rp ${zone.cost.toLocaleString('id-ID')} (${zone.minDistanceKm}-${zone.maxDistanceKm === Infinity ? '20+' : zone.maxDistanceKm}km)`,
    };
  }

  /**
   * Simple distance estimator based on destination.
   * In production, replace with geocoding API (Google Maps, Mapbox).
   */
  private estimateDistance(destination: string, _weight: number): number {
    // Use a simple hash-based estimator for consistent results
    const normalized = destination.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Map to a reasonable distance range (1-30km)
    return Math.abs(hash % 30) + 1;
  }

  /**
   * Get available delivery zones for a store.
   */
  async getDeliveryZones(storeId: string): Promise<{
    storeId: string;
    shippingMode: ShippingMode;
    zones: DeliveryZone[];
  }> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { id: storeId },
      select: { id: true, themeSettings: true },
    });

    if (!store) {
      throw new NotFoundException('Online store not found');
    }

    const settings = (store.themeSettings as Record<string, unknown>) || {};
    const shippingMode = (settings['shippingMode'] as ShippingMode) || 'distance';

    if (shippingMode === 'free') {
      return {
        storeId,
        shippingMode,
        zones: [
          {
            name: 'Semua Area',
            minDistanceKm: 0,
            maxDistanceKm: Infinity,
            cost: 0,
            estimatedDays: 1,
          },
        ],
      };
    }

    if (shippingMode === 'flat_rate') {
      const flatRate =
        typeof settings['flatRateAmount'] === 'number'
          ? settings['flatRateAmount']
          : typeof settings['deliveryFee'] === 'number'
            ? settings['deliveryFee']
            : 15000;

      return {
        storeId,
        shippingMode,
        zones: [
          {
            name: 'Flat Rate',
            minDistanceKm: 0,
            maxDistanceKm: Infinity,
            cost: flatRate,
            estimatedDays: 1,
          },
        ],
      };
    }

    return {
      storeId,
      shippingMode,
      zones: this.defaultDeliveryZones.map((z) => ({
        ...z,
        maxDistanceKm: z.maxDistanceKm === Infinity ? 9999 : z.maxDistanceKm,
      })),
    };
  }

  // ========================================================================
  // STOREFRONT PUBLIC API
  // ========================================================================

  /**
   * Get public storefront data: store info, categories, products with prices/images.
   * No authentication required.
   */
  async getStorefrontData(slug: string): Promise<StorefrontData> {
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

    const settings = (store.themeSettings as Record<string, unknown>) || {};

    // Fetch active products with categories and stock
    const products = await this.prisma.product.findMany({
      where: { businessId: store.businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: { select: { id: true, name: true, imageUrl: true } },
        stockLevels: {
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build category list with product counts
    const categoryMap = new Map<
      string,
      { id: string; name: string; imageUrl: string | null; productCount: number }
    >();
    for (const product of products) {
      const catId = product.categoryId || 'uncategorized';
      const catName = product.category?.name || 'Uncategorized';
      const catImage = product.category?.imageUrl || null;
      const existing = categoryMap.get(catId);
      if (existing) {
        existing.productCount++;
      } else {
        categoryMap.set(catId, { id: catId, name: catName, imageUrl: catImage, productCount: 1 });
      }
    }

    const categories = Array.from(categoryMap.values());

    // Build product list
    const productList = products.map((product) => {
      const totalStock = product.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);
      const inStock = !product.trackStock || totalStock > 0;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: Number(product.basePrice),
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        categoryName: product.category?.name || null,
        variants: product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: Number(v.price),
        })),
        inStock,
      };
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
        isDeliveryEnabled: (settings['isDeliveryEnabled'] as boolean) ?? true,
        isPickupEnabled: (settings['isPickupEnabled'] as boolean) ?? false,
      },
      categories,
      products: productList,
    };
  }

  /**
   * Get detailed product info for the storefront product detail page.
   * No authentication required.
   */
  async getStorefrontProduct(slug: string, productId: string): Promise<StorefrontProductDetail> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { slug },
      select: { id: true, businessId: true, isActive: true },
    });

    if (!store || !store.isActive) {
      throw new NotFoundException('Store not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId: store.businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: { select: { id: true, name: true } },
        productModifierGroups: {
          include: {
            modifierGroup: {
              include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
        stockLevels: {
          select: { quantity: true },
        },
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
      basePrice: Number(product.basePrice),
      imageUrl: product.imageUrl,
      categoryId: product.categoryId,
      categoryName: product.category?.name || null,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
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
          price: Number(m.price),
        })),
      })),
      inStock: !product.trackStock || totalStock > 0,
      totalStock: product.trackStock ? totalStock : null,
    };
  }

  /**
   * Create a storefront order - customer places order without authentication.
   * Validates stock availability and creates the store order.
   */
  async createStorefrontOrder(
    slug: string,
    orderData: StorefrontOrderInput,
  ): Promise<StorefrontOrderResult> {
    const store = await this.prisma.onlineStore.findUnique({
      where: { slug },
      select: {
        id: true,
        businessId: true,
        isActive: true,
        storeOrders: { select: { id: true }, take: 0 },
      },
    });

    if (!store || !store.isActive) {
      throw new NotFoundException('Store not found');
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Fetch all products referenced in the order
    const productIds = [...new Set(orderData.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId: store.businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        stockLevels: { select: { quantity: true, variantId: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate and build order items
    const orderItems: {
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of orderData.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      let unitPrice = Number(product.basePrice);
      let variantName: string | null = null;
      const variantId = item.variantId || null;

      if (variantId) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (!variant) {
          throw new NotFoundException(`Variant not found: ${variantId}`);
        }
        unitPrice = Number(variant.price);
        variantName = variant.name;
      }

      // Check stock if product tracks stock
      if (product.trackStock) {
        const relevantStock = product.stockLevels.filter((sl) => sl.variantId === variantId);
        const totalStock = relevantStock.reduce((sum, sl) => sum + Number(sl.quantity), 0);
        if (totalStock < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for ${product.name}. Available: ${totalStock}, Requested: ${item.quantity}`,
          );
        }
      }

      orderItems.push({
        productId: product.id,
        variantId,
        productName: product.name,
        variantName,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Get first outlet for the business as default fulfillment outlet
    const outlet = await this.prisma.outlet.findFirst({
      where: { businessId: store.businessId, isActive: true },
      select: { id: true },
    });

    if (!outlet) {
      throw new BadRequestException('No active outlet found for this store');
    }

    const shippingCost = 0; // Shipping calculated separately via calculateShipping
    const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const storeOrder = await this.prisma.storeOrder.create({
      data: {
        storeId: store.id,
        outletId: outlet.id,
        orderNumber,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail || null,
        shippingAddress: orderData.shippingAddress || null,
        shippingMethod: orderData.shippingMethod || null,
        notes: orderData.notes || null,
        subtotal,
        shippingCost,
        grandTotal: subtotal + shippingCost,
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
    });

    this.logger.log(`Storefront order created: ${orderNumber} for store ${slug}`);

    // Create kitchen order for KDS so kitchen can prepare the food
    const kitchenOrderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const kitchenOrder = await this.prisma.order.create({
      data: {
        outletId: outlet.id,
        orderNumber: kitchenOrderNumber,
        orderType: orderData.shippingMethod === 'pickup' ? 'takeaway' : 'delivery',
        status: 'pending',
        notes: `Online order ${orderNumber} - ${orderData.customerName}`,
      },
    });

    for (const item of orderItems) {
      await this.prisma.orderItem.create({
        data: {
          orderId: kitchenOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          quantity: item.quantity,
          status: 'pending',
        },
      });
    }

    // Notify KDS via event bus
    this.eventBus.publish(new OrderStatusChangedEvent(kitchenOrder.id, outlet.id, '', 'pending'));

    this.logger.log(`Kitchen order ${kitchenOrderNumber} created for online order ${orderNumber}`);

    return {
      orderId: storeOrder.id,
      orderNumber: storeOrder.orderNumber,
      subtotal,
      shippingCost,
      grandTotal: subtotal + shippingCost,
      status: storeOrder.orderStatus,
      createdAt: storeOrder.createdAt,
    };
  }
}
