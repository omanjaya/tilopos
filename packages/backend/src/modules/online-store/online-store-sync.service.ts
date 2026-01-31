import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ShippingZone } from '../../application/dtos/online-store.dto';

export interface SyncResult {
    synced: number;
    failed: number;
    errors: string[];
}

export interface SelectiveSyncResult extends SyncResult {
    priceOverrides: number;
    skippedProducts: string[];
}

export interface ShippingQuote {
    courier: string;
    service: string;
    cost: number;
    estimatedDays: number;
    zone: string;
}

export interface FulfillResult {
    orderId: string;
    orderNumber: string;
    status: string;
    trackingNumber: string;
    shippingProvider: string;
    shippedAt: Date;
}

/** Default shipping zone rates (configurable per store) */
const DEFAULT_ZONE_RATES: Record<ShippingZone, { baseRate: number; perKgRate: number; estimatedDays: number }> = {
    [ShippingZone.SAME_CITY]: { baseRate: 8000, perKgRate: 3000, estimatedDays: 1 },
    [ShippingZone.INTER_CITY]: { baseRate: 12000, perKgRate: 5000, estimatedDays: 3 },
    [ShippingZone.INTER_PROVINCE]: { baseRate: 18000, perKgRate: 8000, estimatedDays: 5 },
};

/**
 * Simple zone resolver based on city name comparison.
 * In production, this would use a geo-lookup service.
 */
function resolveZone(origin: string, destination: string): ShippingZone {
    const normOrigin = origin.trim().toLowerCase();
    const normDest = destination.trim().toLowerCase();

    if (normOrigin === normDest) {
        return ShippingZone.SAME_CITY;
    }

    // Extract province hint from "City, Province" format
    const originProvince = normOrigin.split(',').pop()?.trim() ?? normOrigin;
    const destProvince = normDest.split(',').pop()?.trim() ?? normDest;

    if (originProvince === destProvince) {
        return ShippingZone.INTER_CITY;
    }

    return ShippingZone.INTER_PROVINCE;
}

@Injectable()
export class OnlineStoreSyncService {
    private readonly logger = new Logger(OnlineStoreSyncService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ========================================================================
    // CATALOG SYNC
    // ========================================================================

    /**
     * Sync all products from POS to online store catalog
     */
    async syncCatalog(businessId: string, storeId: string): Promise<SyncResult> {
        const result: SyncResult = { synced: 0, failed: 0, errors: [] };

        try {
            // Get all active products for the business
            const products = await this.prisma.product.findMany({
                where: { businessId, isActive: true },
                include: {
                    variants: { where: { isActive: true } },
                    category: true,
                },
            });

            // Update store settings with product sync info
            const store = await this.prisma.onlineStore.findUnique({
                where: { id: storeId },
                select: { themeSettings: true },
            });

            const currentSettings = (store?.themeSettings as Record<string, unknown>) || {};

            await this.prisma.onlineStore.update({
                where: { id: storeId },
                data: {
                    themeSettings: {
                        ...currentSettings,
                        lastCatalogSync: new Date().toISOString(),
                        productCount: products.length,
                        categoryCount: new Set(products.map((p) => p.categoryId).filter(Boolean)).size,
                    } as never,
                },
            });

            result.synced = products.length;
            this.logger.log(`Synced ${products.length} products for store ${storeId}`);
        } catch (error) {
            const errorMessage = (error as Error).message;
            result.failed++;
            result.errors.push(errorMessage);
            this.logger.error(`Catalog sync failed: ${errorMessage}`);
        }

        return result;
    }

    /**
     * Selectively sync specific products to the online store with optional price overrides.
     *
     * - Only the listed productIds are published to the storefront.
     * - priceOverrides allow setting a different online price for a product.
     */
    async syncCatalogSelective(
        businessId: string,
        storeId: string,
        productIds: string[],
        priceOverrides?: { productId: string; onlinePrice: number }[],
    ): Promise<SelectiveSyncResult> {
        const result: SelectiveSyncResult = {
            synced: 0,
            failed: 0,
            errors: [],
            priceOverrides: 0,
            skippedProducts: [],
        };

        try {
            const store = await this.prisma.onlineStore.findUnique({
                where: { id: storeId },
                select: { businessId: true, themeSettings: true },
            });

            if (!store) {
                throw new NotFoundException('Online store not found');
            }

            if (store.businessId !== businessId) {
                throw new BadRequestException('Store does not belong to this business');
            }

            // Fetch only the requested products
            const products = await this.prisma.product.findMany({
                where: {
                    id: { in: productIds },
                    businessId,
                    isActive: true,
                },
                include: {
                    variants: { where: { isActive: true } },
                    category: true,
                },
            });

            const foundIds = new Set(products.map((p) => p.id));
            result.skippedProducts = productIds.filter((id) => !foundIds.has(id));

            // Build price override map
            const overrideMap = new Map<string, number>();
            if (priceOverrides) {
                for (const override of priceOverrides) {
                    overrideMap.set(override.productId, override.onlinePrice);
                }
            }

            // Build catalog entries with price overrides
            const catalogEntries = products.map((product) => ({
                productId: product.id,
                name: product.name,
                categoryId: product.categoryId,
                onlinePrice: overrideMap.get(product.id) ?? null,
                variants: product.variants.map((v) => ({
                    variantId: v.id,
                    name: v.name,
                })),
            }));

            const currentSettings = (store.themeSettings as Record<string, unknown>) || {};

            await this.prisma.onlineStore.update({
                where: { id: storeId },
                data: {
                    themeSettings: {
                        ...currentSettings,
                        lastCatalogSync: new Date().toISOString(),
                        catalogEntries,
                        productCount: catalogEntries.length,
                        categoryCount: new Set(products.map((p) => p.categoryId).filter(Boolean)).size,
                    } as never,
                },
            });

            result.synced = catalogEntries.length;
            result.priceOverrides = overrideMap.size;
            this.logger.log(
                `Selectively synced ${catalogEntries.length} products (${overrideMap.size} price overrides) for store ${storeId}`,
            );
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            const errorMessage = (error as Error).message;
            result.failed++;
            result.errors.push(errorMessage);
            this.logger.error(`Selective catalog sync failed: ${errorMessage}`);
        }

        return result;
    }

    // ========================================================================
    // INVENTORY SYNC
    // ========================================================================

    /**
     * Sync inventory levels from POS to online store
     */
    async syncInventory(outletId: string, storeId: string): Promise<SyncResult> {
        const result: SyncResult = { synced: 0, failed: 0, errors: [] };

        try {
            // Get all stock levels for the outlet
            const stockLevels = await this.prisma.stockLevel.findMany({
                where: { outletId },
                select: {
                    productId: true,
                    variantId: true,
                    quantity: true,
                },
            });

            // Update store settings with inventory sync info
            const store = await this.prisma.onlineStore.findUnique({
                where: { id: storeId },
                select: { themeSettings: true },
            });

            const currentSettings = (store?.themeSettings as Record<string, unknown>) || {};

            // Create inventory map for quick lookup
            const inventoryMap: Record<string, number> = {};
            for (const stock of stockLevels) {
                const key = stock.variantId || stock.productId || 'unknown';
                inventoryMap[key] = Number(stock.quantity);
            }

            await this.prisma.onlineStore.update({
                where: { id: storeId },
                data: {
                    themeSettings: {
                        ...currentSettings,
                        lastInventorySync: new Date().toISOString(),
                        inventoryMap,
                    } as never,
                },
            });

            result.synced = stockLevels.length;
            this.logger.log(`Synced ${stockLevels.length} inventory items for store ${storeId}`);
        } catch (error) {
            const errorMessage = (error as Error).message;
            result.failed++;
            result.errors.push(errorMessage);
            this.logger.error(`Inventory sync failed: ${errorMessage}`);
        }

        return result;
    }

    // ========================================================================
    // STOCK CHECK & RESERVATION
    // ========================================================================

    /**
     * Check if product is in stock
     */
    async checkStock(productId: string, variantId: string | null, outletId: string, quantity: number): Promise<boolean> {
        const stockLevel = await this.prisma.stockLevel.findFirst({
            where: {
                outletId,
                productId,
                variantId: variantId || null,
            },
        });

        if (!stockLevel) {
            return false; // No stock record means out of stock
        }

        return Number(stockLevel.quantity) >= quantity;
    }

    /**
     * Check stock for multiple items at once and return per-item availability
     */
    async checkStockBulk(
        items: { productId: string; variantId?: string | null; quantity: number }[],
        outletId: string,
    ): Promise<{ productId: string; variantId: string | null; requested: number; available: number; inStock: boolean }[]> {
        const results: { productId: string; variantId: string | null; requested: number; available: number; inStock: boolean }[] = [];

        for (const item of items) {
            const vid = item.variantId ?? null;
            const stockLevel = await this.prisma.stockLevel.findFirst({
                where: { outletId, productId: item.productId, variantId: vid },
            });

            const available = stockLevel ? Number(stockLevel.quantity) : 0;
            results.push({
                productId: item.productId,
                variantId: vid,
                requested: item.quantity,
                available,
                inStock: available >= item.quantity,
            });
        }

        return results;
    }

    /**
     * Reserve inventory for pending order
     */
    async reserveInventory(
        items: { productId: string; variantId?: string; quantity: number }[],
        outletId: string,
    ): Promise<boolean> {
        // Check stock for all items first
        for (const item of items) {
            const hasStock = await this.checkStock(item.productId, item.variantId || null, outletId, item.quantity);
            if (!hasStock) {
                return false;
            }
        }

        // Reserve stock (decrement temporarily)
        for (const item of items) {
            await this.prisma.stockLevel.updateMany({
                where: {
                    outletId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                },
                data: {
                    quantity: {
                        decrement: item.quantity,
                    },
                },
            });
        }

        return true;
    }

    /**
     * Release reserved inventory (e.g., order cancelled)
     */
    async releaseInventory(
        items: { productId: string; variantId?: string; quantity: number }[],
        outletId: string,
    ): Promise<void> {
        for (const item of items) {
            await this.prisma.stockLevel.updateMany({
                where: {
                    outletId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                },
                data: {
                    quantity: {
                        increment: item.quantity,
                    },
                },
            });
        }
    }

    // ========================================================================
    // SHIPPING CALCULATOR (zone-based)
    // ========================================================================

    /**
     * Calculate shipping cost using zone-based rates.
     *
     * Zones: same_city, inter_city, inter_province.
     * Each zone has a configurable baseRate and perKgRate.
     */
    async calculateShipping(
        originCity: string,
        destinationCity: string,
        weight: number, // in grams
    ): Promise<ShippingQuote[]> {
        const zone = resolveZone(originCity, destinationCity);
        const rates = DEFAULT_ZONE_RATES[zone];
        const weightKg = Math.ceil(weight / 1000);

        const zoneCost = rates.baseRate + weightKg * rates.perKgRate;

        return [
            {
                courier: 'JNE',
                service: 'REG',
                cost: zoneCost,
                estimatedDays: rates.estimatedDays,
                zone,
            },
            {
                courier: 'JNE',
                service: 'YES',
                cost: Math.round(zoneCost * 1.8),
                estimatedDays: Math.max(1, rates.estimatedDays - 1),
                zone,
            },
            {
                courier: 'SiCepat',
                service: 'REG',
                cost: Math.round(zoneCost * 0.9),
                estimatedDays: rates.estimatedDays + 1,
                zone,
            },
            ...(zone === ShippingZone.SAME_CITY
                ? [
                      {
                          courier: 'GoSend',
                          service: 'Same Day',
                          cost: 25000,
                          estimatedDays: 0,
                          zone,
                      },
                      {
                          courier: 'GrabExpress',
                          service: 'Instant',
                          cost: 30000,
                          estimatedDays: 0,
                          zone,
                      },
                  ]
                : []),
        ];
    }

    /**
     * Calculate shipping cost with configurable zone rates.
     * Allows stores to provide their own rate tables.
     */
    async calculateShippingWithRates(
        originCity: string,
        destinationCity: string,
        weight: number,
        customRates?: Record<ShippingZone, { baseRate: number; perKgRate: number; estimatedDays: number }>,
    ): Promise<{ zone: ShippingZone; quotes: ShippingQuote[] }> {
        const zone = resolveZone(originCity, destinationCity);
        const ratesTable = customRates ?? DEFAULT_ZONE_RATES;
        const rates = ratesTable[zone];
        const weightKg = Math.ceil(weight / 1000);
        const baseCost = rates.baseRate + weightKg * rates.perKgRate;

        const quotes: ShippingQuote[] = [
            { courier: 'Standard', service: 'Regular', cost: baseCost, estimatedDays: rates.estimatedDays, zone },
            { courier: 'Express', service: 'Fast', cost: Math.round(baseCost * 1.6), estimatedDays: Math.max(1, rates.estimatedDays - 1), zone },
        ];

        return { zone, quotes };
    }

    // ========================================================================
    // ORDER FULFILLMENT
    // ========================================================================

    /**
     * Mark an order as fulfilled / shipped with tracking info
     */
    async fulfillOrder(
        orderId: string,
        trackingNumber: string,
        shippingProvider: string,
        notes?: string,
    ): Promise<FulfillResult> {
        const order = await this.prisma.storeOrder.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Store order not found');
        }

        if (order.orderStatus === 'cancelled') {
            throw new BadRequestException('Cannot fulfill a cancelled order');
        }

        if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
            throw new BadRequestException(`Order is already ${order.orderStatus}`);
        }

        const now = new Date();

        const updated = await this.prisma.storeOrder.update({
            where: { id: orderId },
            data: {
                orderStatus: 'shipped',
                trackingNumber,
                shippingMethod: shippingProvider,
                shippedAt: now,
                notes: notes ?? order.notes,
            },
        });

        this.logger.log(`Order ${updated.orderNumber} fulfilled with tracking ${trackingNumber} via ${shippingProvider}`);

        return {
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            status: updated.orderStatus,
            trackingNumber: updated.trackingNumber ?? trackingNumber,
            shippingProvider,
            shippedAt: now,
        };
    }
}
