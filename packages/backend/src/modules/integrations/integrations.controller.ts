/**
 * Integrations Controller
 *
 * API endpoints for external integrations:
 * - Food Delivery (GoFood, GrabFood, ShopeeFood)
 * - E-commerce (Tokopedia, Shopee)
 * - Social Commerce (WhatsApp, Instagram, Facebook)
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
    // ===========================================================================
    // Food Delivery Endpoints
    // ===========================================================================

    @Get('food-delivery/status')
    @ApiOperation({ summary: 'Get food delivery platform connection status' })
    async getFoodDeliveryStatus() {
        return {
            success: true,
            data: {
                gofood: { connected: false },
                grabfood: { connected: false },
                shopeefood: { connected: false },
            },
        };
    }

    @Post('food-delivery/:platform/connect')
    @ApiOperation({ summary: 'Connect to food delivery platform' })
    async connectFoodDelivery(
        @Param('platform') platform: 'gofood' | 'grabfood' | 'shopeefood',
        @Body() _dto: Record<string, unknown>,
    ) {
        return {
            success: true,
            message: `Connected to ${platform} (stub)`,
        };
    }

    @Post('food-delivery/:platform/disconnect')
    @ApiOperation({ summary: 'Disconnect from food delivery platform' })
    async disconnectFoodDelivery(
        @Param('platform') platform: 'gofood' | 'grabfood' | 'shopeefood',
    ) {
        return {
            success: true,
            message: `Disconnected from ${platform} (stub)`,
        };
    }

    @Post('food-delivery/:platform/sync-menu')
    @ApiOperation({ summary: 'Sync menu to food delivery platform' })
    async syncMenuToFoodDelivery(
        @Param('platform') platform: 'gofood' | 'grabfood' | 'shopeefood',
        @Body() dto: { items: unknown[] },
    ) {
        return {
            success: true,
            message: `Synced ${dto.items.length} items to ${platform} (stub)`,
        };
    }

    @Get('food-delivery/:platform/orders')
    @ApiOperation({ summary: 'Get orders from food delivery platform' })
    async getFoodDeliveryOrders(
        @Param('platform') _platform: 'gofood' | 'grabfood' | 'shopeefood',
    ) {
        return {
            success: true,
            data: [],
        };
    }

    @Post('food-delivery/:platform/orders/:orderId/accept')
    @ApiOperation({ summary: 'Accept food delivery order' })
    async acceptFoodDeliveryOrder(
        @Param('platform') platform: 'gofood' | 'grabfood' | 'shopeefood',
        @Param('orderId') orderId: string,
    ) {
        return {
            success: true,
            message: `Order ${orderId} accepted on ${platform} (stub)`,
        };
    }

    @Put('food-delivery/:platform/orders/:orderId/status')
    @ApiOperation({ summary: 'Update food delivery order status' })
    async updateFoodDeliveryOrderStatus(
        @Param('platform') platform: 'gofood' | 'grabfood' | 'shopeefood',
        @Param('orderId') orderId: string,
        @Body() dto: { status: string },
    ) {
        return {
            success: true,
            message: `Order ${orderId} status updated to ${dto.status} on ${platform} (stub)`,
        };
    }

    // ===========================================================================
    // E-commerce Endpoints
    // ===========================================================================

    @Get('ecommerce/status')
    @ApiOperation({ summary: 'Get e-commerce platform connection status' })
    async getEcommerceStatus() {
        return {
            success: true,
            data: {
                tokopedia: { connected: false },
                shopee: { connected: false },
            },
        };
    }

    @Post('ecommerce/:platform/connect')
    @ApiOperation({ summary: 'Connect to e-commerce platform' })
    async connectEcommerce(
        @Param('platform') platform: 'tokopedia' | 'shopee',
        @Body() _dto: Record<string, unknown>,
    ) {
        return {
            success: true,
            message: `Connected to ${platform} (stub)`,
        };
    }

    @Post('ecommerce/:platform/disconnect')
    @ApiOperation({ summary: 'Disconnect from e-commerce platform' })
    async disconnectEcommerce(
        @Param('platform') platform: 'tokopedia' | 'shopee',
    ) {
        return {
            success: true,
            message: `Disconnected from ${platform} (stub)`,
        };
    }

    @Post('ecommerce/:platform/sync-products')
    @ApiOperation({ summary: 'Sync products to e-commerce platform' })
    async syncProductsToEcommerce(
        @Param('platform') platform: 'tokopedia' | 'shopee',
        @Body() dto: { products: unknown[] },
    ) {
        return {
            success: true,
            message: `Synced ${dto.products.length} products to ${platform} (stub)`,
        };
    }

    @Get('ecommerce/:platform/orders')
    @ApiOperation({ summary: 'Get orders from e-commerce platform' })
    async getEcommerceOrders(
        @Param('platform') _platform: 'tokopedia' | 'shopee',
    ) {
        return {
            success: true,
            data: [],
        };
    }

    // ===========================================================================
    // Social Commerce Endpoints
    // ===========================================================================

    @Get('social-commerce/status')
    @ApiOperation({ summary: 'Get social commerce platform connection status' })
    async getSocialCommerceStatus() {
        return {
            success: true,
            data: {
                whatsapp: { connected: false },
                instagram: { connected: false },
                facebook: { connected: false },
            },
        };
    }

    @Post('social-commerce/:platform/connect')
    @ApiOperation({ summary: 'Connect to social commerce platform' })
    async connectSocialCommerce(
        @Param('platform') platform: 'whatsapp' | 'instagram' | 'facebook',
        @Body() _dto: Record<string, unknown>,
    ) {
        return {
            success: true,
            message: `Connected to ${platform} (stub)`,
        };
    }

    @Post('social-commerce/:platform/disconnect')
    @ApiOperation({ summary: 'Disconnect from social commerce platform' })
    async disconnectSocialCommerce(
        @Param('platform') platform: 'whatsapp' | 'instagram' | 'facebook',
    ) {
        return {
            success: true,
            message: `Disconnected from ${platform} (stub)`,
        };
    }

    @Post('social-commerce/whatsapp/catalog/sync')
    @ApiOperation({ summary: 'Sync catalog to WhatsApp' })
    async syncWhatsAppCatalog(
        @Body() dto: { products: unknown[] },
    ) {
        return {
            success: true,
            message: `Synced ${dto.products.length} products to WhatsApp catalog (stub)`,
        };
    }

    @Post('social-commerce/whatsapp/send-message')
    @ApiOperation({ summary: 'Send WhatsApp message' })
    async sendWhatsAppMessage(
        @Body() dto: { to: string; message: string },
    ) {
        return {
            success: true,
            message: `Message sent to ${dto.to} (stub)`,
        };
    }

    // ===========================================================================
    // Webhooks
    // ===========================================================================

    @Post('webhooks/food-delivery/:platform')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Food delivery webhook endpoint' })
    async foodDeliveryWebhook(
        @Param('platform') platform: 'gofood' | 'grabfood' | 'shopeefood',
        @Body() payload: Record<string, unknown>,
    ) {
        console.log(`[Webhook] ${platform}:`, payload);
        return { success: true };
    }

    @Post('webhooks/ecommerce/:platform')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'E-commerce webhook endpoint' })
    async ecommerceWebhook(
        @Param('platform') platform: 'tokopedia' | 'shopee',
        @Body() payload: Record<string, unknown>,
    ) {
        console.log(`[Webhook] ${platform}:`, payload);
        return { success: true };
    }

    @Post('webhooks/social-commerce/:platform')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Social commerce webhook endpoint' })
    async socialCommerceWebhook(
        @Param('platform') platform: 'whatsapp' | 'instagram' | 'facebook',
        @Body() payload: Record<string, unknown>,
    ) {
        console.log(`[Webhook] ${platform}:`, payload);
        return { success: true };
    }
}
