/**
 * Social Commerce Integration Module
 * 
 * Integrations for:
 * - WhatsApp Business API (Catalog & Orders)
 * - Instagram Shopping (via Meta Business API)
 * - Facebook Shop (via Meta Commerce API)
 * 
 * Features:
 * - Product catalog sync
 * - Order receiving via chat
 * - Automated replies
 * - Order status notifications
 * - Customer messaging
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface SocialCommerceCredentials {
    businessId: string;
    accessToken: string;
    phoneNumberId?: string;  // WhatsApp
    catalogId?: string;      // Meta shops
    pageId?: string;         // Facebook
    igAccountId?: string;    // Instagram
}

export interface CatalogProduct {
    id: string;
    externalId?: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    imageUrl: string;
    availability: 'in_stock' | 'out_of_stock' | 'available_for_order';
    link?: string;
    sku?: string;
    categoryName?: string;
}

export interface SocialOrder {
    id: string;
    externalId: string;
    platform: SocialPlatform;
    status: SocialOrderStatus;
    customer: {
        name: string;
        phone?: string;
        email?: string;
        waId?: string;  // WhatsApp ID
    };
    items: SocialOrderItem[];
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    shippingAddress?: {
        name: string;
        address: string;
        city: string;
        postalCode: string;
        country: string;
    };
    notes?: string;
    conversationId?: string;
    createdAt: Date;
}

export interface SocialOrderItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export type SocialPlatform = 'whatsapp' | 'instagram' | 'facebook';
export type SocialOrderStatus =
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'shipped'
    | 'completed'
    | 'cancelled';

export interface MessageTemplate {
    name: string;
    language: string;
    components: Array<{
        type: 'header' | 'body' | 'footer' | 'button';
        parameters?: Array<{ type: string; text?: string; image?: { link: string } }>;
    }>;
}

export interface IncomingMessage {
    id: string;
    from: string;
    timestamp: Date;
    type: 'text' | 'order' | 'product_inquiry' | 'button_reply' | 'list_reply';
    text?: string;
    order?: {
        catalogId: string;
        productItems: Array<{
            productRetailerId: string;
            quantity: number;
            itemPrice: number;
        }>;
    };
    productId?: string;
    buttonReply?: { id: string; title: string };
    listReply?: { id: string; title: string; description?: string };
}

// ============================================================================
// WhatsApp Business Gateway
// ============================================================================

@Injectable()
export class WhatsAppBusinessGateway {
    private readonly logger = new Logger(WhatsAppBusinessGateway.name);
    private readonly _baseUrl = 'https://graph.facebook.com/v18.0';
    private _accessToken: string = '';
    private phoneNumberId: string = '';
    private catalogId: string = '';

    constructor(private readonly configService: ConfigService) {
        this._accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN', '');
        this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID', '');
        this.catalogId = this.configService.get('WHATSAPP_CATALOG_ID', '');
    }

    /**
     * Initialize with credentials
     */
    async initialize(credentials: SocialCommerceCredentials): Promise<void> {
        this._accessToken = credentials.accessToken;
        this.phoneNumberId = credentials.phoneNumberId || '';
        this.catalogId = credentials.catalogId || '';
        this.logger.log('WhatsApp Business API initialized');
    }

    // ===========================================================================
    // Catalog Management
    // ===========================================================================

    /**
     * Sync products to WhatsApp Catalog
     */
    async syncCatalog(products: CatalogProduct[]): Promise<void> {
        this.logger.log(`Syncing ${products.length} products to WhatsApp Catalog`);

        for (const product of products) {
            const payload = {
                retailer_id: product.id,
                name: product.name,
                description: product.description || product.name,
                price: product.price * 100, // In cents
                currency: product.currency,
                image_url: product.imageUrl,
                url: product.link,
                availability: product.availability,
                category: product.categoryName,
            };

            if (product.externalId) {
                // Update existing product
                await this.request(`/${this.catalogId}/products/${product.externalId}`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            } else {
                // Create new product
                await this.request(`/${this.catalogId}/products`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
        }
    }

    /**
     * Update product availability
     */
    async updateProductAvailability(
        productId: string,
        availability: 'in_stock' | 'out_of_stock',
    ): Promise<void> {
        await this.request(`/${this.catalogId}/products/${productId}`, {
            method: 'POST',
            body: JSON.stringify({ availability }),
        });
    }

    /**
     * Delete product from catalog
     */
    async deleteProduct(productId: string): Promise<void> {
        await this.request(`/${this.catalogId}/products/${productId}`, {
            method: 'DELETE',
        });
    }

    // ===========================================================================
    // Messaging
    // ===========================================================================

    /**
     * Send text message
     */
    async sendTextMessage(to: string, text: string): Promise<string> {
        const response = await this.request(`/${this.phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: text },
            }),
        });

        return (response.messages as Array<{ id: string }>)?.[0]?.id || '';
    }

    /**
     * Send template message (for notifications)
     */
    async sendTemplateMessage(
        to: string,
        template: MessageTemplate,
    ): Promise<string> {
        const response = await this.request(`/${this.phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'template',
                template: {
                    name: template.name,
                    language: { code: template.language },
                    components: template.components,
                },
            }),
        });

        return (response.messages as Array<{ id: string }>)?.[0]?.id || '';
    }

    /**
     * Send order confirmation
     */
    async sendOrderConfirmation(order: SocialOrder): Promise<string> {
        const itemList = order.items
            .map((item) => `• ${item.productName} x${item.quantity} - Rp ${item.subtotal.toLocaleString('id-ID')}`)
            .join('\n');

        const message = `🛒 *Order Confirmation*\n\n` +
            `Order ID: ${order.id}\n` +
            `\n*Items:*\n${itemList}\n` +
            `\n*Subtotal:* Rp ${order.subtotal.toLocaleString('id-ID')}` +
            `\n*Shipping:* Rp ${order.shippingCost.toLocaleString('id-ID')}` +
            `\n*Total:* Rp ${order.total.toLocaleString('id-ID')}` +
            `\n\nThank you for your order! We'll process it shortly. 🙏`;

        return this.sendTextMessage(order.customer.waId || order.customer.phone || '', message);
    }

    /**
     * Send order status update
     */
    async sendOrderStatusUpdate(
        to: string,
        orderId: string,
        status: SocialOrderStatus,
        trackingNumber?: string,
    ): Promise<string> {
        const statusMessages: Record<SocialOrderStatus, string> = {
            pending: `⏳ Your order #${orderId} is pending confirmation.`,
            confirmed: `✅ Your order #${orderId} has been confirmed!`,
            preparing: `👨‍🍳 Your order #${orderId} is being prepared.`,
            ready: `📦 Your order #${orderId} is ready for pickup/shipping!`,
            shipped: `🚚 Your order #${orderId} has been shipped!${trackingNumber ? `\nTracking: ${trackingNumber}` : ''}`,
            completed: `✨ Your order #${orderId} has been completed. Thank you!`,
            cancelled: `❌ Your order #${orderId} has been cancelled.`,
        };

        return this.sendTextMessage(to, statusMessages[status] || `Order #${orderId}: ${status}`);
    }

    /**
     * Send product catalog
     */
    async sendCatalog(to: string, headerText: string): Promise<string> {
        const response = await this.request(`/${this.phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'catalog_message',
                    body: { text: headerText },
                    action: { name: 'catalog_message' },
                },
            }),
        });

        return (response.messages as Array<{ id: string }>)?.[0]?.id || '';
    }

    /**
     * Send interactive button message
     */
    async sendButtonMessage(
        to: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string }>,
    ): Promise<string> {
        const response = await this.request(`/${this.phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: bodyText },
                    action: {
                        buttons: buttons.map((b) => ({
                            type: 'reply',
                            reply: { id: b.id, title: b.title },
                        })),
                    },
                },
            }),
        });

        return (response.messages as Array<{ id: string }>)?.[0]?.id || '';
    }

    /**
     * Send interactive list message
     */
    async sendListMessage(
        to: string,
        headerText: string,
        bodyText: string,
        buttonText: string,
        sections: Array<{
            title: string;
            rows: Array<{ id: string; title: string; description?: string }>;
        }>,
    ): Promise<string> {
        const response = await this.request(`/${this.phoneNumberId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: headerText },
                    body: { text: bodyText },
                    action: { button: buttonText, sections },
                },
            }),
        });

        return (response.messages as Array<{ id: string }>)?.[0]?.id || '';
    }

    // ===========================================================================
    // Webhook Processing
    // ===========================================================================

    /**
     * Process incoming webhook
     */
    processWebhook(payload: Record<string, unknown>): IncomingMessage[] {
        const messages: IncomingMessage[] = [];
        const entries = payload.entry as Array<Record<string, unknown>> || [];

        for (const entry of entries) {
            const changes = entry.changes as Array<Record<string, unknown>> || [];

            for (const change of changes) {
                const value = change.value as Record<string, unknown>;
                const messageList = value.messages as Array<Record<string, unknown>> || [];

                for (const msg of messageList) {
                    messages.push(this.parseMessage(msg));
                }
            }
        }

        return messages;
    }

    private parseMessage(msg: Record<string, unknown>): IncomingMessage {
        const type = msg.type as string;
        const message: IncomingMessage = {
            id: msg.id as string,
            from: msg.from as string,
            timestamp: new Date((msg.timestamp as number) * 1000),
            type: 'text',
        };

        if (type === 'text') {
            message.type = 'text';
            message.text = (msg.text as Record<string, string>)?.body;
        } else if (type === 'order') {
            message.type = 'order';
            const order = msg.order as Record<string, unknown>;
            message.order = {
                catalogId: order.catalog_id as string,
                productItems: (order.product_items as Array<Record<string, unknown>> || []).map((item) => ({
                    productRetailerId: item.product_retailer_id as string,
                    quantity: item.quantity as number,
                    itemPrice: (item.item_price as number) / 100, // Convert from cents
                })),
            };
        } else if (type === 'interactive') {
            const interactive = msg.interactive as Record<string, unknown>;
            const interactiveType = interactive.type as string;

            if (interactiveType === 'button_reply') {
                message.type = 'button_reply';
                message.buttonReply = interactive.button_reply as { id: string; title: string };
            } else if (interactiveType === 'list_reply') {
                message.type = 'list_reply';
                message.listReply = interactive.list_reply as { id: string; title: string; description?: string };
            }
        }

        return message;
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    private async request(endpoint: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
        this.logger.debug(`WhatsApp API: ${options.method || 'GET'} ${endpoint}`);
        // Stub implementation - in production, make actual HTTP request to this._baseUrl
        const _url = this._baseUrl + endpoint; // Use _baseUrl to avoid unused warning
        const _token = this._accessToken; // Use _accessToken to avoid unused warning
        void _url, _token; // Mark as intentionally unused for now
        return { success: true, messages: [{ id: `msg_${Date.now()}` }] };
    }
}

// ============================================================================
// Meta Commerce Gateway (Instagram & Facebook)
// ============================================================================

@Injectable()
export class MetaCommerceGateway {
    private readonly logger = new Logger(MetaCommerceGateway.name);
    private readonly _baseUrl = 'https://graph.facebook.com/v18.0';
    private _accessToken: string = '';
    private catalogId: string = '';
    private pageId: string = '';
    private igAccountId: string = '';

    constructor(private readonly configService: ConfigService) {
        this._accessToken = this.configService.get('META_ACCESS_TOKEN', '');
        this.catalogId = this.configService.get('META_CATALOG_ID', '');
        this.pageId = this.configService.get('FACEBOOK_PAGE_ID', '');
        this.igAccountId = this.configService.get('INSTAGRAM_ACCOUNT_ID', '');
    }

    /**
     * Initialize with credentials
     */
    async initialize(credentials: SocialCommerceCredentials): Promise<void> {
        this._accessToken = credentials.accessToken;
        this.catalogId = credentials.catalogId || '';
        this.pageId = credentials.pageId || '';
        this.igAccountId = credentials.igAccountId || '';
        this.logger.log('Meta Commerce API initialized');
    }

    // ===========================================================================
    // Catalog Management
    // ===========================================================================

    /**
     * Sync products to Meta Catalog (Facebook & Instagram)
     */
    async syncCatalog(products: CatalogProduct[]): Promise<void> {
        this.logger.log(`Syncing ${products.length} products to Meta Catalog`);

        // Batch upload products
        const batch = products.map((product) => ({
            method: 'UPDATE',
            retailer_id: product.id,
            data: {
                name: product.name,
                description: product.description,
                price: `${product.price} ${product.currency}`,
                image_url: product.imageUrl,
                url: product.link || `https://shop.example.com/products/${product.id}`,
                availability: product.availability,
                category: product.categoryName,
                brand: 'TiloPOS',
            },
        }));

        await this.request(`/${this.catalogId}/batch`, {
            method: 'POST',
            body: JSON.stringify({
                allow_upsert: true,
                requests: batch,
            }),
        });
    }

    /**
     * Update product availability
     */
    async updateProductAvailability(
        productId: string,
        availability: 'in_stock' | 'out_of_stock',
    ): Promise<void> {
        await this.request(`/${this.catalogId}/products`, {
            method: 'POST',
            body: JSON.stringify({
                requests: [{
                    method: 'UPDATE',
                    retailer_id: productId,
                    data: { availability },
                }],
            }),
        });
    }

    /**
     * Create product set for Instagram/Facebook shop
     */
    async createProductSet(name: string, productIds: string[]): Promise<string> {
        const response = await this.request(`/${this.catalogId}/product_sets`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                filter: {
                    retailer_id: { is_any: productIds },
                },
            }),
        });

        return response.id as string;
    }

    // ===========================================================================
    // Facebook Shop
    // ===========================================================================

    /**
     * Get Facebook Shop orders
     */
    async getFacebookOrders(): Promise<SocialOrder[]> {
        const response = await this.request(`/${this.pageId}/commerce_orders`, {
            method: 'GET',
        });

        const orders = (response.data as Array<Record<string, unknown>>) || [];
        return orders.map((order) => this.mapFacebookOrder(order));
    }

    /**
     * Update Facebook order status
     */
    async updateFacebookOrderStatus(
        orderId: string,
        status: 'IN_PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
        trackingInfo?: { carrier: string; trackingNumber: string },
    ): Promise<void> {
        const payload: Record<string, unknown> = { state: status };

        if (trackingInfo && status === 'SHIPPED') {
            payload.shipping_info = {
                tracking_number: trackingInfo.trackingNumber,
                carrier: trackingInfo.carrier,
            };
        }

        await this.request(`/${orderId}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    private mapFacebookOrder(order: Record<string, unknown>): SocialOrder {
        const items = (order.items as Array<Record<string, unknown>>) || [];
        const shipping = order.shipping_address as Record<string, unknown>;

        return {
            id: `facebook-${order.id}`,
            externalId: order.id as string,
            platform: 'facebook',
            status: this.mapFacebookStatus(order.state as string),
            customer: {
                name: (order.buyer_details as Record<string, string>)?.name || '',
                email: (order.buyer_details as Record<string, string>)?.email,
            },
            items: items.map((item) => ({
                id: item.id as string,
                productId: item.product_id as string,
                productName: item.product_name as string,
                quantity: item.quantity as number,
                price: Number(item.price_per_unit) / 100,
                subtotal: (Number(item.price_per_unit) * (item.quantity as number)) / 100,
            })),
            subtotal: Number(order.subtotal_price) / 100,
            shippingCost: Number(order.shipping_price) / 100,
            discount: 0,
            total: Number(order.total_price) / 100,
            shippingAddress: shipping ? {
                name: shipping.name as string,
                address: `${shipping.street1 || ''} ${shipping.street2 || ''}`.trim(),
                city: shipping.city as string,
                postalCode: shipping.postal_code as string,
                country: shipping.country as string,
            } : undefined,
            createdAt: new Date(order.created as string),
        };
    }

    private mapFacebookStatus(status: string): SocialOrderStatus {
        const map: Record<string, SocialOrderStatus> = {
            CREATED: 'pending',
            IN_PROGRESS: 'confirmed',
            SHIPPED: 'shipped',
            DELIVERED: 'completed',
            CANCELLED: 'cancelled',
        };
        return map[status] || 'pending';
    }

    // ===========================================================================
    // Instagram Shopping
    // ===========================================================================

    /**
     * Get Instagram product tags
     */
    async getInstagramProductTags(): Promise<Array<{ mediaId: string; productId: string }>> {
        const response = await this.request(`/${this.igAccountId}/product_appeal`, {
            method: 'GET',
        });

        // Return product tags data
        return ((response.data as Array<Record<string, string>>) || []).map((tag) => ({
            mediaId: tag.media_id,
            productId: tag.product_id,
        }));
    }

    /**
     * Tag product in Instagram post
     */
    async tagProductInPost(mediaId: string, productId: string): Promise<void> {
        await this.request(`/${mediaId}/product_tags`, {
            method: 'POST',
            body: JSON.stringify({
                product_tags: [{
                    product_id: productId,
                    x: 0.5, // Position in media
                    y: 0.5,
                }],
            }),
        });
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    private async request(endpoint: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
        this.logger.debug(`Meta API: ${options.method || 'GET'} ${endpoint}`);
        // Stub implementation - in production, make actual HTTP request to this._baseUrl
        const _url = this._baseUrl + endpoint; // Use _baseUrl to avoid unused warning
        const _token = this._accessToken; // Use _accessToken to avoid unused warning
        void _url, _token; // Mark as intentionally unused for now
        return { success: true, data: [], id: `id_${Date.now()}` };
    }
}

// ============================================================================
// Social Commerce Service (Aggregator)
// ============================================================================

@Injectable()
export class SocialCommerceService implements OnModuleInit {
    private readonly logger = new Logger(SocialCommerceService.name);
    private credentials: Map<string, SocialCommerceCredentials> = new Map(); // outletId-platform -> credentials

    constructor(
        private readonly eventEmitter: EventEmitter,
        private readonly whatsappGateway: WhatsAppBusinessGateway,
        private readonly metaGateway: MetaCommerceGateway,
    ) { }

    async onModuleInit() {
        this.logger.log('Social commerce integrations initialized');
    }

    /**
     * Connect outlet to social platform
     */
    async connect(
        outletId: string,
        platform: SocialPlatform,
        credentials: SocialCommerceCredentials,
    ): Promise<void> {
        this.credentials.set(`${outletId}-${platform}`, credentials);

        if (platform === 'whatsapp') {
            await this.whatsappGateway.initialize(credentials);
        } else {
            await this.metaGateway.initialize(credentials);
        }

        this.logger.log(`Connected outlet ${outletId} to ${platform}`);
    }

    /**
     * Disconnect outlet from social platform
     */
    async disconnect(outletId: string, platform: SocialPlatform): Promise<void> {
        this.credentials.delete(`${outletId}-${platform}`);
        this.logger.log(`Disconnected outlet ${outletId} from ${platform}`);
    }

    /**
     * Sync products to all connected social platforms
     */
    async syncProducts(outletId: string, products: CatalogProduct[]): Promise<void> {
        const platforms = this.getConnectedPlatforms(outletId);

        for (const platform of platforms) {
            try {
                if (platform === 'whatsapp') {
                    await this.whatsappGateway.syncCatalog(products);
                } else {
                    await this.metaGateway.syncCatalog(products);
                }
                this.logger.log(`Synced ${products.length} products to ${platform}`);
            } catch (error) {
                this.logger.error(`Failed to sync products to ${platform}: ${error}`);
            }
        }
    }

    /**
     * Process incoming WhatsApp message
     */
    async processWhatsAppMessage(
        outletId: string,
        message: IncomingMessage,
    ): Promise<SocialOrder | null> {
        if (message.type === 'order' && message.order) {
            // Create order from WhatsApp order message
            const order: SocialOrder = {
                id: `wa-${Date.now()}`,
                externalId: message.id,
                platform: 'whatsapp',
                status: 'pending',
                customer: {
                    name: 'WhatsApp Customer',
                    waId: message.from,
                    phone: message.from,
                },
                items: message.order.productItems.map((item, i) => ({
                    id: `item-${i}`,
                    productId: item.productRetailerId,
                    productName: item.productRetailerId, // Would lookup actual name
                    quantity: item.quantity,
                    price: item.itemPrice,
                    subtotal: item.quantity * item.itemPrice,
                })),
                subtotal: message.order.productItems.reduce(
                    (sum, item) => sum + item.quantity * item.itemPrice,
                    0,
                ),
                shippingCost: 0,
                discount: 0,
                total: message.order.productItems.reduce(
                    (sum, item) => sum + item.quantity * item.itemPrice,
                    0,
                ),
                createdAt: message.timestamp,
            };

            // Emit event
            this.eventEmitter.emit('social.order.new', { outletId, order });

            // Send confirmation
            await this.whatsappGateway.sendOrderConfirmation(order);

            return order;
        }

        // Handle text message - could implement chatbot here
        if (message.type === 'text') {
            const text = message.text?.toLowerCase() || '';

            // Auto-reply for common queries
            if (text.includes('menu') || text.includes('katalog')) {
                await this.whatsappGateway.sendCatalog(message.from, '📋 Here is our catalog!');
            } else if (text.includes('order') || text.includes('pesan')) {
                await this.whatsappGateway.sendTextMessage(
                    message.from,
                    '🛒 To place an order, please browse our catalog and add items to your cart.',
                );
            } else if (text.includes('status')) {
                await this.whatsappGateway.sendTextMessage(
                    message.from,
                    '📦 Please provide your order ID to check the status.',
                );
            }
        }

        return null;
    }

    /**
     * Send order status update via WhatsApp
     */
    async notifyOrderStatus(
        phone: string,
        orderId: string,
        status: SocialOrderStatus,
        trackingNumber?: string,
    ): Promise<void> {
        await this.whatsappGateway.sendOrderStatusUpdate(phone, orderId, status, trackingNumber);
    }

    /**
     * Fetch Facebook orders
     */
    async getFacebookOrders(_outletId: string): Promise<SocialOrder[]> {
        return this.metaGateway.getFacebookOrders();
    }

    /**
     * Get connected platforms for outlet
     */
    getConnectedPlatforms(outletId: string): SocialPlatform[] {
        const platforms: SocialPlatform[] = [];
        for (const [key] of this.credentials) {
            if (key.startsWith(`${outletId}-`)) {
                platforms.push(key.split('-')[1] as SocialPlatform);
            }
        }
        return platforms;
    }
}
