/**
 * Integrations Module
 *
 * Combines all external integrations:
 * - Food Delivery: GoFood, GrabFood, ShopeeFood
 * - E-commerce: Tokopedia, Shopee
 * - Social Commerce: WhatsApp, Instagram, Facebook
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter } from 'events';

// Food Delivery (existing)
import {
    GoFoodGateway,
    GrabFoodGateway,
    ShopeeFoodGateway,
    MarketplaceService,
} from './marketplace.service';

// E-commerce (new)
import {
    TokopediaGateway,
    ShopeeGateway,
    EcommerceMarketplaceService,
} from './ecommerce-marketplace.service';

// Social Commerce (new)
import {
    WhatsAppBusinessGateway,
    MetaCommerceGateway,
    SocialCommerceService,
} from './social-commerce.service';

@Module({
    imports: [ConfigModule],
    providers: [
        // Event emitter for internal events
        {
            provide: EventEmitter,
            useFactory: () => new EventEmitter(),
        },

        // Food Delivery Gateways
        GoFoodGateway,
        GrabFoodGateway,
        ShopeeFoodGateway,
        MarketplaceService,

        // E-commerce Gateways
        TokopediaGateway,
        ShopeeGateway,
        EcommerceMarketplaceService,

        // Social Commerce Gateways
        WhatsAppBusinessGateway,
        MetaCommerceGateway,
        SocialCommerceService,
    ],
    exports: [
        // Food Delivery
        MarketplaceService,
        GoFoodGateway,
        GrabFoodGateway,
        ShopeeFoodGateway,

        // E-commerce
        EcommerceMarketplaceService,
        TokopediaGateway,
        ShopeeGateway,

        // Social Commerce
        SocialCommerceService,
        WhatsAppBusinessGateway,
        MetaCommerceGateway,
    ],
})
export class IntegrationsModule { }
