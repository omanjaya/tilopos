/**
 * E-commerce Marketplace Integration Module
 * 
 * Integrations for:
 * - Tokopedia (Indonesia's largest marketplace)
 * - Shopee (Southeast Asia's largest marketplace)
 * 
 * Features:
 * - Product catalog sync
 * - Order receiving & fulfillment
 * - Inventory sync
 * - Price sync
 * - Shipping management
 * - Settlement reconciliation
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface EcommerceCredentials {
    shopId: string;
    partnerId?: string;
    apiKey: string;
    apiSecret: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export interface EcommerceProduct {
    id: string;
    externalId?: string;
    sku?: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    weight: number; // grams
    images: string[];
    categoryId?: string;
    categoryName?: string;
    isActive: boolean;
    variants?: EcommerceVariant[];
}

export interface EcommerceVariant {
    id: string;
    sku?: string;
    name: string;
    price: number;
    stock: number;
    attributes: Record<string, string>; // e.g., { color: 'Red', size: 'M' }
}

export interface EcommerceOrder {
    id: string;
    externalId: string;
    platform: EcommercePlatform;
    status: EcommerceOrderStatus;
    buyer: {
        name: string;
        phone: string;
        email?: string;
    };
    shippingAddress: {
        recipientName: string;
        phone: string;
        address: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
    };
    items: EcommerceOrderItem[];
    subtotal: number;
    shippingCost: number;
    insuranceCost: number;
    discount: number;
    total: number;
    paymentMethod: string;
    isPaid: boolean;
    shipping: {
        logisticName: string;
        serviceType: string;
        trackingNumber?: string;
        estimatedDelivery?: Date;
    };
    notes?: string;
    createdAt: Date;
    paidAt?: Date;
    shippedAt?: Date;
    completedAt?: Date;
}

export interface EcommerceOrderItem {
    id: string;
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    sku?: string;
    quantity: number;
    price: number;
    subtotal: number;
    weight: number;
}

export type EcommercePlatform = 'tokopedia' | 'shopee';
export type EcommerceOrderStatus =
    | 'unpaid'
    | 'paid'
    | 'ready_to_ship'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'return_requested'
    | 'returned';

export interface EcommerceSettlement {
    id: string;
    period: { start: Date; end: Date };
    totalSales: number;
    commission: number;
    shippingSubsidy: number;
    voucherSubsidy: number;
    adjustments: number;
    netAmount: number;
    status: 'pending' | 'processed' | 'settled';
    settledAt?: Date;
}

export interface ShippingLabel {
    trackingNumber: string;
    labelUrl: string;
    courier: string;
    serviceType: string;
}

// ============================================================================
// Base Interface
// ============================================================================

export interface IEcommerceGateway {
    platform: EcommercePlatform;

    // Authentication
    authenticate(credentials: EcommerceCredentials): Promise<EcommerceCredentials>;
    refreshToken(credentials: EcommerceCredentials): Promise<EcommerceCredentials>;

    // Product Management
    syncProducts(products: EcommerceProduct[]): Promise<void>;
    updateProductStock(productId: string, variantId: string | null, stock: number): Promise<void>;
    updateProductPrice(productId: string, variantId: string | null, price: number): Promise<void>;
    deactivateProduct(productId: string): Promise<void>;

    // Order Management
    fetchNewOrders(): Promise<EcommerceOrder[]>;
    acceptOrder(orderId: string): Promise<void>;
    rejectOrder(orderId: string, reason: string): Promise<void>;
    getShippingLabel(orderId: string): Promise<ShippingLabel>;
    shipOrder(orderId: string, trackingNumber: string): Promise<void>;

    // Settlements
    fetchSettlements(startDate: Date, endDate: Date): Promise<EcommerceSettlement[]>;
}

// ============================================================================
// Tokopedia Gateway
// ============================================================================

@Injectable()
export class TokopediaGateway implements IEcommerceGateway {
    readonly platform = 'tokopedia' as const;
    private readonly logger = new Logger(TokopediaGateway.name);
    private readonly _baseUrl = 'https://fs.tokopedia.net';

    async authenticate(credentials: EcommerceCredentials): Promise<EcommerceCredentials> {
        this.logger.log('Authenticating with Tokopedia...');

        const response = await this.request('/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        return {
            ...credentials,
            accessToken: response.access_token as string,
            expiresAt: new Date(Date.now() + (response.expires_in as number) * 1000),
        };
    }

    async refreshToken(credentials: EcommerceCredentials): Promise<EcommerceCredentials> {
        return this.authenticate(credentials);
    }

    async syncProducts(products: EcommerceProduct[]): Promise<void> {
        this.logger.log(`Syncing ${products.length} products to Tokopedia`);

        for (const product of products) {
            const payload = {
                shop_id: parseInt(process.env.TOKOPEDIA_SHOP_ID || '0'),
                products: [{
                    name: product.name,
                    description: product.description,
                    sku: product.sku,
                    price: product.price,
                    stock: product.stock,
                    weight: product.weight,
                    weight_unit: 'GR',
                    condition: 'NEW',
                    pictures: product.images.map((url, i) => ({
                        file_path: url,
                        position: i + 1,
                    })),
                    status: product.isActive ? 'LIMITED' : 'DELETED',
                }],
            };

            if (product.externalId) {
                // Update existing product
                await this.request(`/v2/products/fs/${process.env.TOKOPEDIA_FS_ID}/edit`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        product_id: parseInt(product.externalId),
                        ...payload.products[0],
                    }),
                });
            } else {
                // Create new product
                await this.request(`/v2/products/fs/${process.env.TOKOPEDIA_FS_ID}/create`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
        }
    }

    async updateProductStock(productId: string, variantId: string | null, stock: number): Promise<void> {
        const payload = {
            shop_id: parseInt(process.env.TOKOPEDIA_SHOP_ID || '0'),
            stock: [{
                product_id: parseInt(productId),
                ...(variantId && { variant_id: parseInt(variantId) }),
                stock,
            }],
        };

        await this.request(`/inventory/v1/fs/${process.env.TOKOPEDIA_FS_ID}/stock/update`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async updateProductPrice(productId: string, variantId: string | null, price: number): Promise<void> {
        const payload = {
            shop_id: parseInt(process.env.TOKOPEDIA_SHOP_ID || '0'),
            products: [{
                product_id: parseInt(productId),
                ...(variantId && { variant_id: parseInt(variantId) }),
                new_price: price,
            }],
        };

        await this.request(`/inventory/v1/fs/${process.env.TOKOPEDIA_FS_ID}/price/update`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async deactivateProduct(productId: string): Promise<void> {
        await this.request(`/v1/products/fs/${process.env.TOKOPEDIA_FS_ID}/delete`, {
            method: 'POST',
            body: JSON.stringify({
                shop_id: parseInt(process.env.TOKOPEDIA_SHOP_ID || '0'),
                product_id: [parseInt(productId)],
            }),
        });
    }

    async fetchNewOrders(): Promise<EcommerceOrder[]> {
        const response = await this.request(
            `/v2/order/list?fs_id=${process.env.TOKOPEDIA_FS_ID}&shop_id=${process.env.TOKOPEDIA_SHOP_ID}&status=220`
        );

        const orders = (response.data as Array<Record<string, unknown>>) || [];
        return orders.map(this.mapOrder.bind(this));
    }

    async acceptOrder(orderId: string): Promise<void> {
        await this.request(`/v1/order/${orderId}/fs/${process.env.TOKOPEDIA_FS_ID}/ack`, {
            method: 'POST',
        });
    }

    async rejectOrder(orderId: string, reason: string): Promise<void> {
        await this.request(`/v1/order/${orderId}/fs/${process.env.TOKOPEDIA_FS_ID}/reject`, {
            method: 'POST',
            body: JSON.stringify({
                reason_code: this.mapRejectReason(reason),
                reason,
            }),
        });
    }

    async getShippingLabel(orderId: string): Promise<ShippingLabel> {
        const response = await this.request(
            `/v1/order/${orderId}/fs/${process.env.TOKOPEDIA_FS_ID}/shipping-label`
        );

        return {
            trackingNumber: response.awb as string,
            labelUrl: response.label_url as string,
            courier: response.courier as string,
            serviceType: response.service_type as string,
        };
    }

    async shipOrder(orderId: string, trackingNumber: string): Promise<void> {
        await this.request(`/v1/order/${orderId}/fs/${process.env.TOKOPEDIA_FS_ID}/status`, {
            method: 'POST',
            body: JSON.stringify({
                order_status: 500, // Shipped
                shipping_ref_num: trackingNumber,
            }),
        });
    }

    async fetchSettlements(startDate: Date, endDate: Date): Promise<EcommerceSettlement[]> {
        const response = await this.request(
            `/v1/fs/${process.env.TOKOPEDIA_FS_ID}/income/statement?` +
            `start_date=${startDate.toISOString().split('T')[0]}&` +
            `end_date=${endDate.toISOString().split('T')[0]}`
        );

        const data = (response.data as Array<Record<string, unknown>>) || [];
        return data.map((s) => ({
            id: s.id as string,
            period: {
                start: new Date(s.period_start as string),
                end: new Date(s.period_end as string),
            },
            totalSales: Number(s.total_sales || 0),
            commission: Number(s.commission || 0),
            shippingSubsidy: Number(s.shipping_subsidy || 0),
            voucherSubsidy: Number(s.voucher_subsidy || 0),
            adjustments: Number(s.adjustments || 0),
            netAmount: Number(s.net_amount || 0),
            status: this.mapSettlementStatus(s.status as string),
            settledAt: s.settled_at ? new Date(s.settled_at as string) : undefined,
        }));
    }

    private async request(endpoint: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
        this.logger.debug(`Tokopedia API: ${options.method || 'GET'} ${endpoint}`);
        // Stub implementation - in production, make actual HTTP request to this._baseUrl
        const _url = this._baseUrl + endpoint; // Use _baseUrl to avoid unused warning
        void _url; // Mark as intentionally unused for now
        return { success: true, data: [], orders: [] };
    }

    private mapOrder(order: Record<string, unknown>): EcommerceOrder {
        const products = order.order_products as Array<Record<string, unknown>> || [];
        return {
            id: `tokopedia-${order.order_id}`,
            externalId: String(order.order_id),
            platform: 'tokopedia',
            status: this.mapOrderStatus(order.order_status as number),
            buyer: {
                name: (order.buyer as Record<string, string>)?.name || '',
                phone: (order.buyer as Record<string, string>)?.phone || '',
                email: (order.buyer as Record<string, string>)?.email,
            },
            shippingAddress: {
                recipientName: (order.recipient as Record<string, string>)?.name || '',
                phone: (order.recipient as Record<string, string>)?.phone || '',
                address: (order.recipient as Record<string, string>)?.address_full || '',
                city: (order.recipient as Record<string, string>)?.city || '',
                province: (order.recipient as Record<string, string>)?.province || '',
                postalCode: (order.recipient as Record<string, string>)?.postal_code || '',
                country: 'Indonesia',
            },
            items: products.map((item) => ({
                id: String(item.order_dtl_id),
                productId: String(item.product_id),
                productName: item.name as string,
                variantId: item.variant_id ? String(item.variant_id) : undefined,
                variantName: item.variant_name as string,
                sku: item.sku as string,
                quantity: item.quantity as number,
                price: item.product_price as number,
                subtotal: item.subtotal as number,
                weight: item.total_weight as number,
            })),
            subtotal: order.order_subtotal as number,
            shippingCost: order.shipping_cost as number,
            insuranceCost: order.insurance_cost as number || 0,
            discount: order.voucher_amount as number || 0,
            total: order.order_total as number,
            paymentMethod: (order.payment as Record<string, string>)?.method || 'Unknown',
            isPaid: (order.order_status as number) >= 220,
            shipping: {
                logisticName: (order.logistics as Record<string, string>)?.shipping_agency || '',
                serviceType: (order.logistics as Record<string, string>)?.service_type || '',
                trackingNumber: order.awb_number as string,
            },
            notes: order.notes as string,
            createdAt: new Date(order.create_time as string),
            paidAt: order.payment_date ? new Date(order.payment_date as string) : undefined,
        };
    }

    private mapOrderStatus(status: number): EcommerceOrderStatus {
        const map: Record<number, EcommerceOrderStatus> = {
            0: 'unpaid',
            100: 'unpaid',
            220: 'paid',
            221: 'ready_to_ship',
            400: 'ready_to_ship',
            450: 'shipped',
            500: 'shipped',
            600: 'delivered',
            700: 'completed',
            690: 'cancelled',
            691: 'cancelled',
            15: 'return_requested',
            10: 'returned',
        };
        return map[status] || 'unpaid';
    }

    private mapSettlementStatus(status: string): 'pending' | 'processed' | 'settled' {
        if (status === 'settled') return 'settled';
        if (status === 'processed') return 'processed';
        return 'pending';
    }

    private mapRejectReason(reason: string): number {
        const rejectCodes: Record<string, number> = {
            'out_of_stock': 1,
            'product_unavailable': 2,
            'wrong_price': 3,
            'buyer_request': 4,
            'other': 5,
        };
        return rejectCodes[reason.toLowerCase()] || 5;
    }
}

// ============================================================================
// Shopee Gateway
// ============================================================================

@Injectable()
export class ShopeeGateway implements IEcommerceGateway {
    readonly platform = 'shopee' as const;
    private readonly logger = new Logger(ShopeeGateway.name);
    private readonly _baseUrl = 'https://partner.shopeemobile.com';

    async authenticate(credentials: EcommerceCredentials): Promise<EcommerceCredentials> {
        this.logger.log('Authenticating with Shopee...');

        const timestamp = Math.floor(Date.now() / 1000);
        const sign = this.generateSign(credentials.partnerId || '', '/api/v2/auth/token/get', timestamp, credentials.apiSecret);

        const response = await this.request('/api/v2/auth/token/get', {
            method: 'POST',
            body: JSON.stringify({
                code: credentials.apiKey, // Auth code from OAuth
                shop_id: parseInt(credentials.shopId),
                partner_id: parseInt(credentials.partnerId || '0'),
            }),
        }, timestamp, sign);

        return {
            ...credentials,
            accessToken: response.access_token as string,
            refreshToken: response.refresh_token as string,
            expiresAt: new Date(Date.now() + (response.expire_in as number) * 1000),
        };
    }

    async refreshToken(credentials: EcommerceCredentials): Promise<EcommerceCredentials> {
        const timestamp = Math.floor(Date.now() / 1000);
        const sign = this.generateSign(credentials.partnerId || '', '/api/v2/auth/access_token/get', timestamp, credentials.apiSecret);

        const response = await this.request('/api/v2/auth/access_token/get', {
            method: 'POST',
            body: JSON.stringify({
                refresh_token: credentials.refreshToken,
                shop_id: parseInt(credentials.shopId),
                partner_id: parseInt(credentials.partnerId || '0'),
            }),
        }, timestamp, sign);

        return {
            ...credentials,
            accessToken: response.access_token as string,
            refreshToken: response.refresh_token as string,
            expiresAt: new Date(Date.now() + (response.expire_in as number) * 1000),
        };
    }

    async syncProducts(products: EcommerceProduct[]): Promise<void> {
        this.logger.log(`Syncing ${products.length} products to Shopee`);

        for (const product of products) {
            if (product.externalId) {
                // Update existing product
                await this.request('/api/v2/product/update_item', {
                    method: 'POST',
                    body: JSON.stringify({
                        item_id: parseInt(product.externalId),
                        item_name: product.name,
                        item_description: product.description,
                        item_sku: product.sku,
                        weight: product.weight / 1000, // Shopee uses kg
                        images: { image_id_list: product.images },
                    }),
                });

                // Update price
                await this.updateProductPrice(product.externalId, null, product.price);

                // Update stock
                await this.updateProductStock(product.externalId, null, product.stock);
            } else {
                // Create new product
                await this.request('/api/v2/product/add_item', {
                    method: 'POST',
                    body: JSON.stringify({
                        item_name: product.name,
                        description: product.description,
                        item_sku: product.sku,
                        original_price: product.price,
                        normal_stock: product.stock,
                        weight: product.weight / 1000,
                        category_id: parseInt(product.categoryId || '0'),
                        image: { image_id_list: product.images },
                        item_status: product.isActive ? 'NORMAL' : 'UNLIST',
                    }),
                });
            }
        }
    }

    async updateProductStock(productId: string, variantId: string | null, stock: number): Promise<void> {
        if (variantId) {
            await this.request('/api/v2/product/update_stock', {
                method: 'POST',
                body: JSON.stringify({
                    item_id: parseInt(productId),
                    stock_list: [{
                        model_id: parseInt(variantId),
                        normal_stock: stock,
                    }],
                }),
            });
        } else {
            await this.request('/api/v2/product/update_stock', {
                method: 'POST',
                body: JSON.stringify({
                    item_id: parseInt(productId),
                    stock_list: [{
                        normal_stock: stock,
                    }],
                }),
            });
        }
    }

    async updateProductPrice(productId: string, variantId: string | null, price: number): Promise<void> {
        if (variantId) {
            await this.request('/api/v2/product/update_price', {
                method: 'POST',
                body: JSON.stringify({
                    item_id: parseInt(productId),
                    price_list: [{
                        model_id: parseInt(variantId),
                        original_price: price,
                    }],
                }),
            });
        } else {
            await this.request('/api/v2/product/update_price', {
                method: 'POST',
                body: JSON.stringify({
                    item_id: parseInt(productId),
                    price_list: [{
                        original_price: price,
                    }],
                }),
            });
        }
    }

    async deactivateProduct(productId: string): Promise<void> {
        await this.request('/api/v2/product/unlist_item', {
            method: 'POST',
            body: JSON.stringify({
                item_list: [{
                    item_id: parseInt(productId),
                    unlist: true,
                }],
            }),
        });
    }

    async fetchNewOrders(): Promise<EcommerceOrder[]> {
        const response = await this.request('/api/v2/order/get_order_list', {
            method: 'GET',
        }, undefined, undefined, {
            time_range_field: 'create_time',
            time_from: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000), // Last 24 hours
            time_to: Math.floor(Date.now() / 1000),
            page_size: 100,
            order_status: 'READY_TO_SHIP',
        });

        const orderSns = (response.order_list as Array<string>) || [];
        const orders: EcommerceOrder[] = [];

        // Fetch order details for each order
        for (const orderSn of orderSns) {
            const detail = await this.request('/api/v2/order/get_order_detail', {
                method: 'GET',
            }, undefined, undefined, { order_sn_list: orderSn });

            const orderData = (detail.order_list as Array<Record<string, unknown>>)?.[0];
            if (orderData) {
                orders.push(this.mapOrder(orderData));
            }
        }

        return orders;
    }

    async acceptOrder(orderId: string): Promise<void> {
        // Shopee doesn't have explicit accept - orders become ready_to_ship automatically
        this.logger.log(`Order ${orderId} accepted (Shopee auto-accepts)`);
    }

    async rejectOrder(orderId: string, reason: string): Promise<void> {
        await this.request('/api/v2/order/cancel_order', {
            method: 'POST',
            body: JSON.stringify({
                order_sn: orderId,
                cancel_reason: this.mapCancelReason(reason),
            }),
        });
    }

    async getShippingLabel(orderId: string): Promise<ShippingLabel> {
        // First, request shipping document
        await this.request('/api/v2/logistics/create_shipping_document', {
            method: 'POST',
            body: JSON.stringify({
                order_list: [{ order_sn: orderId }],
            }),
        });

        // Get document info
        const response = await this.request('/api/v2/logistics/get_shipping_document_info', {
            method: 'POST',
            body: JSON.stringify({
                order_list: [{ order_sn: orderId }],
            }),
        });

        const docInfo = (response.result_list as Array<Record<string, unknown>>)?.[0] || {};

        // Download document
        const downloadResponse = await this.request('/api/v2/logistics/download_shipping_document', {
            method: 'POST',
            body: JSON.stringify({
                shipping_document_type: 'THERMAL_AIR_WAYBILL',
                order_list: [{ order_sn: orderId }],
            }),
        });

        return {
            trackingNumber: docInfo.tracking_number as string || '',
            labelUrl: downloadResponse.file_url as string || '',
            courier: docInfo.shipping_carrier as string || '',
            serviceType: docInfo.service_type as string || '',
        };
    }

    async shipOrder(orderId: string, trackingNumber: string): Promise<void> {
        await this.request('/api/v2/logistics/ship_order', {
            method: 'POST',
            body: JSON.stringify({
                order_sn: orderId,
                pickup: { tracking_number: trackingNumber },
            }),
        });
    }

    async fetchSettlements(startDate: Date, endDate: Date): Promise<EcommerceSettlement[]> {
        const response = await this.request('/api/v2/payment/get_wallet_transaction_list', {
            method: 'GET',
        }, undefined, undefined, {
            create_time_from: Math.floor(startDate.getTime() / 1000),
            create_time_to: Math.floor(endDate.getTime() / 1000),
            page_no: 1,
            page_size: 100,
        });

        // Group transactions by period
        const transactions = (response.wallet_transaction_list as Array<Record<string, unknown>>) || [];
        const grouped = new Map<string, EcommerceSettlement>();

        for (const tx of transactions) {
            const date = new Date((tx.create_time as number) * 1000);
            const periodKey = `${date.getFullYear()}-${date.getMonth()}-${Math.floor(date.getDate() / 7)}`;

            if (!grouped.has(periodKey)) {
                grouped.set(periodKey, {
                    id: periodKey,
                    period: { start: date, end: date },
                    totalSales: 0,
                    commission: 0,
                    shippingSubsidy: 0,
                    voucherSubsidy: 0,
                    adjustments: 0,
                    netAmount: 0,
                    status: 'pending',
                });
            }

            const settlement = grouped.get(periodKey)!;
            const amount = Number(tx.amount || 0);
            const type = tx.transaction_type as string;

            if (type === 'SALES') settlement.totalSales += amount;
            if (type === 'COMMISSION') settlement.commission += Math.abs(amount);
            if (type === 'SHIPPING_FEE') settlement.shippingSubsidy += amount;
            if (type === 'SELLER_VOUCHER') settlement.voucherSubsidy += Math.abs(amount);
            if (type === 'ADJUSTMENT') settlement.adjustments += amount;
            settlement.netAmount += amount;
        }

        return Array.from(grouped.values());
    }

    private async request(
        endpoint: string,
        options: RequestInit = {},
        _timestamp?: number,
        _sign?: string,
        _params?: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
        this.logger.debug(`Shopee API: ${options.method || 'GET'} ${endpoint}`);
        // Stub implementation - in production, make actual HTTP request to this._baseUrl
        const _url = this._baseUrl + endpoint; // Use _baseUrl to avoid unused warning
        void _url; // Mark as intentionally unused for now
        return { success: true, order_list: [], wallet_transaction_list: [] };
    }

    private generateSign(_partnerId: string, _path: string, _timestamp: number, _secret: string): string {
        // In production, generate HMAC signature
        // const baseString = `${partnerId}${path}${timestamp}`;
        // return crypto.createHmac('sha256', secret).update(baseString).digest('hex');
        return 'stub_signature';
    }

    private mapOrder(order: Record<string, unknown>): EcommerceOrder {
        const items = (order.item_list as Array<Record<string, unknown>>) || [];
        const recipient = order.recipient_address as Record<string, unknown>;

        return {
            id: `shopee-${order.order_sn}`,
            externalId: order.order_sn as string,
            platform: 'shopee',
            status: this.mapOrderStatus(order.order_status as string),
            buyer: {
                name: order.buyer_username as string,
                phone: recipient?.phone as string,
                email: order.buyer_email as string,
            },
            shippingAddress: {
                recipientName: recipient?.name as string || '',
                phone: recipient?.phone as string || '',
                address: `${recipient?.full_address || ''}`.trim(),
                city: recipient?.city as string || '',
                province: recipient?.state as string || '',
                postalCode: recipient?.zipcode as string || '',
                country: recipient?.region as string || 'Indonesia',
            },
            items: items.map((item) => ({
                id: String(item.item_id),
                productId: String(item.item_id),
                productName: item.item_name as string,
                variantId: item.model_id ? String(item.model_id) : undefined,
                variantName: item.model_name as string,
                sku: item.item_sku as string,
                quantity: item.model_quantity_purchased as number,
                price: Number(item.model_discounted_price || item.model_original_price),
                subtotal: Number(item.model_discounted_price || item.model_original_price) * (item.model_quantity_purchased as number),
                weight: (item.weight as number) || 0,
            })),
            subtotal: Number(order.total_amount),
            shippingCost: Number(order.actual_shipping_fee || 0),
            insuranceCost: 0,
            discount: Number(order.seller_discount || 0) + Number(order.shopee_discount || 0),
            total: Number(order.total_amount),
            paymentMethod: order.payment_method as string || 'Unknown',
            isPaid: order.order_status !== 'UNPAID',
            shipping: {
                logisticName: (order.shipping_carrier as string) || '',
                serviceType: (order.checkout_shipping_carrier as string) || '',
                trackingNumber: order.tracking_no as string,
                estimatedDelivery: order.ship_by_date ? new Date((order.ship_by_date as number) * 1000) : undefined,
            },
            notes: order.message_to_seller as string,
            createdAt: new Date((order.create_time as number) * 1000),
            paidAt: order.pay_time ? new Date((order.pay_time as number) * 1000) : undefined,
            shippedAt: order.ship_time ? new Date((order.ship_time as number) * 1000) : undefined,
        };
    }

    private mapOrderStatus(status: string): EcommerceOrderStatus {
        const map: Record<string, EcommerceOrderStatus> = {
            UNPAID: 'unpaid',
            READY_TO_SHIP: 'ready_to_ship',
            PROCESSED: 'ready_to_ship',
            SHIPPED: 'shipped',
            COMPLETED: 'completed',
            IN_CANCEL: 'cancelled',
            CANCELLED: 'cancelled',
            INVOICE_PENDING: 'paid',
        };
        return map[status] || 'unpaid';
    }

    private mapCancelReason(reason: string): string {
        const reasonMap: Record<string, string> = {
            'out_of_stock': 'OUT_OF_STOCK',
            'buyer_request': 'CUSTOMER_REQUEST',
            'other': 'UNDELIVERABLE_AREA',
        };
        return reasonMap[reason.toLowerCase()] || 'UNDELIVERABLE_AREA';
    }
}

// ============================================================================
// E-commerce Service (Aggregator)
// ============================================================================

@Injectable()
export class EcommerceMarketplaceService implements OnModuleInit {
    private readonly logger = new Logger(EcommerceMarketplaceService.name);
    private gateways: Map<EcommercePlatform, IEcommerceGateway> = new Map();
    private credentials: Map<string, EcommerceCredentials> = new Map(); // outletId-platform -> credentials

    constructor(
        private readonly eventEmitter: EventEmitter,
        tokopediaGateway: TokopediaGateway,
        shopeeGateway: ShopeeGateway,
    ) {
        this.gateways.set('tokopedia', tokopediaGateway);
        this.gateways.set('shopee', shopeeGateway);
    }

    async onModuleInit() {
        this.logger.log('E-commerce marketplace integrations initialized');
    }

    /**
     * Connect outlet to e-commerce platform
     */
    async connect(
        outletId: string,
        platform: EcommercePlatform,
        credentials: EcommerceCredentials,
    ): Promise<EcommerceCredentials> {
        const gateway = this.gateways.get(platform);
        if (!gateway) throw new Error(`Unknown platform: ${platform}`);

        const authed = await gateway.authenticate(credentials);
        this.credentials.set(`${outletId}-${platform}`, authed);

        this.logger.log(`Connected outlet ${outletId} to ${platform}`);
        return authed;
    }

    /**
     * Disconnect outlet from e-commerce platform
     */
    async disconnect(outletId: string, platform: EcommercePlatform): Promise<void> {
        this.credentials.delete(`${outletId}-${platform}`);
        this.logger.log(`Disconnected outlet ${outletId} from ${platform}`);
    }

    /**
     * Sync products to all connected e-commerce platforms
     */
    async syncProducts(outletId: string, products: EcommerceProduct[]): Promise<void> {
        for (const [platform, gateway] of this.gateways) {
            const creds = this.credentials.get(`${outletId}-${platform}`);
            if (!creds) continue;

            try {
                await gateway.syncProducts(products);
                this.logger.log(`Synced ${products.length} products to ${platform}`);
            } catch (error) {
                this.logger.error(`Failed to sync products to ${platform}: ${error}`);
            }
        }
    }

    /**
     * Update product stock across all platforms
     */
    async updateProductStock(
        outletId: string,
        productId: string,
        variantId: string | null,
        stock: number,
    ): Promise<void> {
        for (const [platform, gateway] of this.gateways) {
            const creds = this.credentials.get(`${outletId}-${platform}`);
            if (!creds) continue;

            try {
                await gateway.updateProductStock(productId, variantId, stock);
            } catch (error) {
                this.logger.error(`Failed to update stock on ${platform}: ${error}`);
            }
        }
    }

    /**
     * Fetch orders from all e-commerce platforms
     */
    async fetchAllNewOrders(outletId: string): Promise<EcommerceOrder[]> {
        const allOrders: EcommerceOrder[] = [];

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
     * Accept e-commerce order
     */
    async acceptOrder(
        outletId: string,
        platform: EcommercePlatform,
        orderId: string,
    ): Promise<void> {
        const gateway = this.gateways.get(platform);
        if (!gateway) throw new Error(`Unknown platform: ${platform}`);

        await gateway.acceptOrder(orderId);

        this.eventEmitter.emit('ecommerce.order.accepted', {
            outletId,
            platform,
            orderId,
        });
    }

    /**
     * Get shipping label for order
     */
    async getShippingLabel(
        _outletId: string,
        platform: EcommercePlatform,
        orderId: string,
    ): Promise<ShippingLabel> {
        const gateway = this.gateways.get(platform);
        if (!gateway) throw new Error(`Unknown platform: ${platform}`);

        return gateway.getShippingLabel(orderId);
    }

    /**
     * Ship order
     */
    async shipOrder(
        _outletId: string,
        platform: EcommercePlatform,
        orderId: string,
        trackingNumber: string,
    ): Promise<void> {
        const gateway = this.gateways.get(platform);
        if (!gateway) throw new Error(`Unknown platform: ${platform}`);

        await gateway.shipOrder(orderId, trackingNumber);

        this.eventEmitter.emit('ecommerce.order.shipped', {
            platform,
            orderId,
            trackingNumber,
        });
    }

    /**
     * Poll for new orders (scheduled)
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async pollOrders(): Promise<void> {
        const outletIds = new Set<string>();
        for (const key of this.credentials.keys()) {
            outletIds.add(key.split('-')[0]);
        }

        for (const outletId of outletIds) {
            const orders = await this.fetchAllNewOrders(outletId);

            for (const order of orders) {
                this.eventEmitter.emit('ecommerce.order.new', {
                    outletId,
                    order,
                });
            }
        }
    }

    /**
     * Get connected e-commerce platforms for outlet
     */
    getConnectedPlatforms(outletId: string): EcommercePlatform[] {
        const platforms: EcommercePlatform[] = [];
        for (const [key] of this.credentials) {
            if (key.startsWith(`${outletId}-`)) {
                platforms.push(key.split('-')[1] as EcommercePlatform);
            }
        }
        return platforms;
    }
}
