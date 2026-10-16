import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IOnlineStoreRepository } from '../../domain/interfaces/repositories/online-store.repository';
import { OnlineStoreSyncService } from './online-store-sync.service';
import { OnlineStoreService } from './online-store.service';
import { TenantAccessService } from '@shared/tenant';
import {
  CatalogSyncDto,
  CatalogSyncQueryDto,
  CreateOnlineStoreDto,
  OnlineOrderFulfillDto,
  ShippingCalculateDto,
  StoreOrdersQueryDto,
  StoreSettingsDto,
  StoreShippingCalculateDto,
  StorefrontOrderDto,
  StorefrontStockCheckQueryDto,
  SyncInventoryQueryDto,
  UpdateStoreOrderStatusDto,
} from '../../application/dtos/online-store.dto';
import { RequireFeature } from '../../common/guards/feature.guard';
import { Public } from '@shared/decorators/public.decorator';

/** Store management (settings, catalog, stock sync) — frontend route MANAGEMENT. */
const STORE_ADMIN = [EmployeeRole.OWNER, EmployeeRole.MANAGER] as const;
/** Handling incoming storefront orders. */
const ORDER_HANDLERS = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
] as const;

/** Anonymous checkout: 10 orders/minute per client. */
const CHECKOUT_THROTTLE = { short: { limit: 10, ttl: 60000 } };
/** Anonymous quotes/lookups. */
const PUBLIC_THROTTLE = { short: { limit: 30, ttl: 60000 } };

@ApiTags('Online Store')
@Controller('online-store')
export class OnlineStoreController {
  constructor(
    @Inject(REPOSITORY_TOKENS.ONLINE_STORE)
    private readonly onlineStoreRepo: IOnlineStoreRepository,
    private readonly syncService: OnlineStoreSyncService,
    private readonly onlineStoreService: OnlineStoreService,
    private readonly tenant: TenantAccessService,
  ) {}

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Get('stores')
  @ApiOperation({ summary: 'List all online stores for business' })
  async listStores(@CurrentUser() user: AuthUser) {
    return this.onlineStoreRepo.findStoresByBusinessId(user.businessId);
  }

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Post('stores')
  @ApiOperation({ summary: 'Create a new online store (409 when the slug is taken)' })
  async createStore(@Body() dto: CreateOnlineStoreDto, @CurrentUser() user: AuthUser) {
    return this.onlineStoreRepo.createStore({
      businessId: user.businessId,
      storeName: dto.storeName,
      slug: dto.slug,
      description: dto.description || null,
    });
  }

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Get('s/:slug')
  @ApiOperation({ summary: 'Get public storefront (public fields only)' })
  async getStorefront(@Param('slug') slug: string) {
    return this.onlineStoreService.getPublicStore(slug);
  }

  @ApiBearerAuth()
  @Roles(...ORDER_HANDLERS)
  @RequireFeature('online_store')
  @Get('s/:slug/orders')
  @ApiOperation({ summary: 'Get store orders (paginated)' })
  async getStoreOrders(
    @Param('slug') slug: string,
    @Query() query: StoreOrdersQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.getStoreOrders(user.businessId, slug, query);
  }

  /** Legacy alias of POST s/:slug/checkout (same implementation). */
  @Public()
  @Throttle(CHECKOUT_THROTTLE)
  @Post('s/:slug/orders')
  @ApiOperation({ summary: 'Create a store order (alias of s/:slug/checkout)' })
  async createStoreOrder(@Param('slug') slug: string, @Body() dto: StorefrontOrderDto) {
    return this.onlineStoreService.createStorefrontOrder(slug, dto);
  }

  @ApiBearerAuth()
  @Roles(...ORDER_HANDLERS)
  @RequireFeature('online_store')
  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update order status (validated transitions)' })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.updateOrderStatus(user.businessId, id, dto.status);
  }

  // ======================================================================
  // CATALOG SYNC ENDPOINTS
  // ======================================================================

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Post('catalog/sync')
  @ApiOperation({ summary: 'Select which products are published on the online store' })
  async syncCatalogSelective(
    @Body() dto: CatalogSyncDto,
    @Query() query: CatalogSyncQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.syncService.syncCatalogSelective(
      user.businessId,
      query.storeId,
      dto.productIds,
      dto.priceOverrides,
    );
  }

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Post('stores/:id/sync-inventory')
  @ApiOperation({ summary: 'Sync inventory levels from POS to online store' })
  async syncInventory(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Query() query: SyncInventoryQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    return this.syncService.syncInventory(user.businessId, outletId, storeId);
  }

  // ======================================================================
  // STOCK / SHIPPING (public)
  // ======================================================================

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Get('s/:slug/stock-check')
  @ApiOperation({ summary: "Check stock at the store's fulfilment outlet" })
  async checkStock(@Param('slug') slug: string, @Query() query: StorefrontStockCheckQueryDto) {
    return this.onlineStoreService.checkStorefrontStock(slug, query);
  }

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Post('shipping/calculate')
  @ApiOperation({ summary: 'Courier rate quotes (501: no courier rate provider configured)' })
  async calculateShipping(@Body() dto: ShippingCalculateDto) {
    return this.syncService.calculateShipping(dto.origin, dto.destination, dto.weight);
  }

  // ======================================================================
  // ORDER FULFILLMENT ENDPOINT
  // ======================================================================

  @ApiBearerAuth()
  @Roles(...ORDER_HANDLERS)
  @RequireFeature('online_store')
  @Put('orders/:id/fulfill')
  @ApiOperation({ summary: 'Mark a confirmed order as shipped with tracking number' })
  async fulfillOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: OnlineOrderFulfillDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.syncService.fulfillOrder(
      user.businessId,
      orderId,
      dto.trackingNumber,
      dto.shippingProvider,
      dto.notes,
    );
  }

  // ======================================================================
  // ENHANCED CATALOG SYNC WITH STOCK CHECK
  // ======================================================================

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Post('stores/:storeId/sync-catalog')
  @ApiOperation({ summary: 'Snapshot the online catalog with stock availability' })
  async syncCatalogEnhanced(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.syncCatalog(user.businessId, storeId);
  }

  // ======================================================================
  // STORE ANALYTICS
  // ======================================================================

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Get('stores/:storeId/analytics')
  @ApiOperation({ summary: 'Get store analytics: orders, revenue, popular products' })
  async getStoreAnalytics(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.getStoreAnalytics(user.businessId, storeId);
  }

  // ======================================================================
  // STORE INVENTORY STATUS
  // ======================================================================

  @ApiBearerAuth()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  @RequireFeature('online_store')
  @Get('stores/:storeId/inventory')
  @ApiOperation({ summary: 'Inventory status of published products at the fulfilment outlet' })
  async getStoreInventory(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.getStoreInventory(user.businessId, storeId);
  }

  // ======================================================================
  // UPDATE STORE SETTINGS
  // ======================================================================

  @ApiBearerAuth()
  @Roles(...STORE_ADMIN)
  @RequireFeature('online_store')
  @Put('stores/:storeId/settings')
  @ApiOperation({ summary: 'Update store settings (delivery, min order, fees, hours, outlet)' })
  async updateStoreSettings(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: StoreSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.updateStoreSettings(user.businessId, storeId, dto);
  }

  // ======================================================================
  // SHIPPING CALCULATOR (store settings)
  // ======================================================================

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Post('stores/:storeId/shipping/calculate')
  @ApiOperation({ summary: 'Shipping cost from the store settings' })
  async calculateStoreShipping(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: StoreShippingCalculateDto,
  ) {
    return this.onlineStoreService.calculateShipping(storeId, dto);
  }

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Get('stores/:storeId/delivery-zones')
  @ApiOperation({ summary: 'Get delivery zones for a store' })
  async getDeliveryZones(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.onlineStoreService.getDeliveryZones(storeId);
  }

  // ======================================================================
  // PUBLIC STOREFRONT API (no auth required)
  // ======================================================================

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Get('s/:slug/storefront')
  @ApiOperation({ summary: 'Get public storefront data (no auth)' })
  async getStorefrontData(@Param('slug') slug: string) {
    return this.onlineStoreService.getStorefrontData(slug);
  }

  @Public()
  @Throttle(PUBLIC_THROTTLE)
  @Get('s/:slug/products/:productId')
  @ApiOperation({ summary: 'Get public product detail (no auth)' })
  async getStorefrontProduct(
    @Param('slug') slug: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.onlineStoreService.getStorefrontProduct(slug, productId);
  }

  @Public()
  @Throttle(CHECKOUT_THROTTLE)
  @Post('s/:slug/checkout')
  @ApiOperation({ summary: 'Public checkout - place an order (no auth)' })
  async storefrontCheckout(@Param('slug') slug: string, @Body() dto: StorefrontOrderDto) {
    return this.onlineStoreService.createStorefrontOrder(slug, dto);
  }
}
