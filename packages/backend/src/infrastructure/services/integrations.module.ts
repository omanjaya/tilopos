/**
 * Integrations Module
 *
 * Combines all external integrations:
 * - Food Delivery: GoFood, GrabFood, ShopeeFood
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter } from 'events';

// Food Delivery
import {
    GoFoodGateway,
    GrabFoodGateway,
    ShopeeFoodGateway,
    MarketplaceService,
} from './marketplace.service';

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
    ],
    exports: [
        MarketplaceService,
        GoFoodGateway,
        GrabFoodGateway,
        ShopeeFoodGateway,
    ],
})
export class IntegrationsModule { }
