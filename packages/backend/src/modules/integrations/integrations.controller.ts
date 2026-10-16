/**
 * Integrations Controller
 *
 * External marketplace/social integrations (GoFood, GrabFood, ShopeeFood,
 * Tokopedia, Shopee, WhatsApp, Instagram, Facebook) are NOT implemented yet.
 * Status endpoints report every platform as disconnected; every action returns
 * 501 Not Implemented instead of a fake success (Docs/ENGINEERING-RULES.md R10).
 */

import { Controller, Get, Post, Put, Param, NotImplementedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../shared/constants/roles';

function notImplemented(feature: string): never {
  throw new NotImplementedException({
    success: false,
    reason: 'NOT_IMPLEMENTED',
    message: `${feature} integration is not available yet`,
  });
}

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  // ===========================================================================
  // Food Delivery
  // ===========================================================================

  @Get('food-delivery/status')
  @ApiOperation({ summary: 'Food delivery connection status (no integration is available yet)' })
  getFoodDeliveryStatus() {
    return {
      success: true,
      data: {
        gofood: { connected: false, available: false },
        grabfood: { connected: false, available: false },
        shopeefood: { connected: false, available: false },
      },
    };
  }

  @Post('food-delivery/:platform/connect')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  connectFoodDelivery(@Param('platform') platform: string): never {
    return notImplemented(`Food delivery (${platform})`);
  }

  @Post('food-delivery/:platform/disconnect')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  disconnectFoodDelivery(@Param('platform') platform: string): never {
    return notImplemented(`Food delivery (${platform})`);
  }

  @Post('food-delivery/:platform/sync-menu')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  syncMenuToFoodDelivery(@Param('platform') platform: string): never {
    return notImplemented(`Food delivery (${platform})`);
  }

  @Get('food-delivery/:platform/orders')
  @ApiOperation({ summary: 'Not implemented (501)' })
  getFoodDeliveryOrders(@Param('platform') platform: string): never {
    return notImplemented(`Food delivery (${platform})`);
  }

  @Post('food-delivery/:platform/orders/:orderId/accept')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Not implemented (501)' })
  acceptFoodDeliveryOrder(@Param('platform') platform: string): never {
    return notImplemented(`Food delivery (${platform})`);
  }

  @Put('food-delivery/:platform/orders/:orderId/status')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Not implemented (501)' })
  updateFoodDeliveryOrderStatus(@Param('platform') platform: string): never {
    return notImplemented(`Food delivery (${platform})`);
  }

  // ===========================================================================
  // E-commerce
  // ===========================================================================

  @Get('ecommerce/status')
  @ApiOperation({ summary: 'E-commerce connection status (no integration is available yet)' })
  getEcommerceStatus() {
    return {
      success: true,
      data: {
        tokopedia: { connected: false, available: false },
        shopee: { connected: false, available: false },
      },
    };
  }

  @Post('ecommerce/:platform/connect')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  connectEcommerce(@Param('platform') platform: string): never {
    return notImplemented(`E-commerce (${platform})`);
  }

  @Post('ecommerce/:platform/disconnect')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  disconnectEcommerce(@Param('platform') platform: string): never {
    return notImplemented(`E-commerce (${platform})`);
  }

  @Post('ecommerce/:platform/sync-products')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  syncProductsToEcommerce(@Param('platform') platform: string): never {
    return notImplemented(`E-commerce (${platform})`);
  }

  @Get('ecommerce/:platform/orders')
  @ApiOperation({ summary: 'Not implemented (501)' })
  getEcommerceOrders(@Param('platform') platform: string): never {
    return notImplemented(`E-commerce (${platform})`);
  }

  // ===========================================================================
  // Social Commerce
  // ===========================================================================

  @Get('social-commerce/status')
  @ApiOperation({ summary: 'Social commerce connection status (no integration is available yet)' })
  getSocialCommerceStatus() {
    return {
      success: true,
      data: {
        whatsapp: { connected: false, available: false },
        instagram: { connected: false, available: false },
        facebook: { connected: false, available: false },
      },
    };
  }

  @Post('social-commerce/:platform/connect')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  connectSocialCommerce(@Param('platform') platform: string): never {
    return notImplemented(`Social commerce (${platform})`);
  }

  @Post('social-commerce/:platform/disconnect')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  disconnectSocialCommerce(@Param('platform') platform: string): never {
    return notImplemented(`Social commerce (${platform})`);
  }

  @Post('social-commerce/whatsapp/catalog/sync')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  syncWhatsAppCatalog(): never {
    return notImplemented('WhatsApp catalog');
  }

  @Post('social-commerce/whatsapp/send-message')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Not implemented (501)' })
  sendWhatsAppMessage(): never {
    return notImplemented('WhatsApp messaging');
  }

  // Webhook endpoints were removed until per-platform signature verification exists.
}
