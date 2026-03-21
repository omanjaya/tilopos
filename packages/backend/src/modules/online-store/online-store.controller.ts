import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IOnlineStoreRepository } from '../../domain/interfaces/repositories/online-store.repository';
import { OnlineStoreSyncService } from './online-store-sync.service';
import { OnlineStoreService } from './online-store.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { StoreSettingsInput, StorefrontOrderInput } from './interfaces';
import {
  CatalogSyncDto,
  ShippingCalculateDto,
  OnlineOrderFulfillDto,
} from '../../application/dtos/online-store.dto';
import { RequireFeature } from '../../common/guards/feature.guard';

@ApiTags('Online Store')
@Controller('online-store')
export class OnlineStoreController {
  constructor(
    @Inject(REPOSITORY_TOKENS.ONLINE_STORE)
    private readonly onlineStoreRepo: IOnlineStoreRepository,
    private readonly syncService: OnlineStoreSyncService,
    private readonly onlineStoreService: OnlineStoreService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Get('stores')
  @ApiOperation({ summary: 'List all online stores for business' })
  async listStores(@CurrentUser() user: AuthUser) {
    return this.onlineStoreRepo.findStoresByBusinessId(user.businessId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Post('stores')
  @ApiOperation({ summary: 'Create a new online store' })
  async createStore(
    @Body() dto: { storeName: string; slug: string; description?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreRepo.createStore({
      businessId: user.businessId,
      storeName: dto.storeName,
      slug: dto.slug,
      description: dto.description || null,
    });
  }

  @Get('s/:slug')
  @ApiOperation({ summary: 'Get public storefront' })
  async getStorefront(@Param('slug') slug: string) {
    const store = await this.onlineStoreRepo.findStoreBySlug(slug);
    if (!store || !store.isActive) throw new NotFoundException('Store not found');
    const products = await this.onlineStoreRepo.findActiveProductsByBusinessId(store.businessId);
    return { store, products };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Get('s/:slug/orders')
  @ApiOperation({ summary: 'Get store orders' })
  async getStoreOrders(
    @Param('slug') slug: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const store = await this.onlineStoreRepo.findStoreBySlug(slug);
    if (!store) throw new NotFoundException('Store not found');
    if (store.businessId !== user.businessId) throw new NotFoundException('Store not found');
    return this.onlineStoreRepo.findStoreOrders(store.id, status);
  }

  @Post('s/:slug/orders')
  @ApiOperation({ summary: 'Create a new store order' })
  async createStoreOrder(
    @Param('slug') slug: string,
    @Body()
    dto: {
      outletId: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      shippingAddress?: string;
      shippingCost?: number;
      items: {
        productId: string;
        variantId?: string;
        productName: string;
        variantName?: string;
        quantity: number;
        unitPrice: number;
      }[];
    },
  ) {
    const store = await this.onlineStoreRepo.findStoreBySlug(slug);
    if (!store) throw new NotFoundException('Store not found');

    // Validate outlet belongs to this store's business
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, businessId: store.businessId },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    // Validate products belong to this business and verify prices server-side
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId: store.businessId },
      include: { variants: { select: { id: true, price: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productName} not found`);
      }

      // Override client-provided price with server price
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) throw new NotFoundException(`Variant not found for ${item.productName}`);
        item.unitPrice = Number(variant.price);
      } else {
        item.unitPrice = Number(product.basePrice);
      }
      item.productName = product.name;

      // Validate quantity
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new BadRequestException('Quantity must be a positive integer');
      }

      const hasStock = await this.syncService.checkStock(
        item.productId,
        item.variantId || null,
        dto.outletId,
        item.quantity,
      );
      if (!hasStock) {
        throw new NotFoundException(`Product ${item.productName} is out of stock`);
      }
    }

    const subtotal = dto.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const shippingCost = dto.shippingCost || 0;
    const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}`;

    // Reserve inventory
    await this.syncService.reserveInventory(dto.items, dto.outletId);

    return this.onlineStoreRepo.createStoreOrder({
      storeId: store.id,
      outletId: dto.outletId,
      orderNumber,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail || null,
      shippingAddress: dto.shippingAddress || null,
      subtotal,
      grandTotal: subtotal + shippingCost,
      items: dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        productName: i.productName,
        variantName: i.variantName || null,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.unitPrice * i.quantity,
      })),
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
    @CurrentUser() user: AuthUser,
  ) {
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(`Invalid status. Valid: ${validStatuses.join(', ')}`);
    }
    // Verify order belongs to user's business
    const order = await this.onlineStoreRepo.findOrderById(id);
    if (!order) throw new NotFoundException('Order not found');
    const store = await this.onlineStoreRepo.findStoreById(order.storeId);
    if (!store || store.businessId !== user.businessId)
      throw new NotFoundException('Order not found');
    return this.onlineStoreRepo.updateOrderStatus(id, dto.status);
  }

  // ======================================================================
  // CATALOG SYNC ENDPOINTS
  // ======================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Post('catalog/sync')
  @ApiOperation({
    summary: 'Selectively sync products to online store with optional price overrides',
  })
  async syncCatalogSelective(
    @Body() dto: CatalogSyncDto,
    @CurrentUser() user: AuthUser,
    @Query('storeId') storeId: string,
  ) {
    return this.syncService.syncCatalogSelective(
      user.businessId,
      storeId,
      dto.productIds,
      dto.priceOverrides,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Post('stores/:id/sync-inventory')
  @ApiOperation({ summary: 'Sync inventory levels from POS to online store' })
  async syncInventory(@Param('id') storeId: string, @Query('outletId') outletId: string) {
    return this.syncService.syncInventory(outletId, storeId);
  }

  // ======================================================================
  // SHIPPING CALCULATION ENDPOINTS
  // ======================================================================

  @Get('stock-check')
  @ApiOperation({ summary: 'Check product stock availability' })
  @ApiQuery({ name: 'productId', required: true })
  @ApiQuery({ name: 'variantId', required: false })
  @ApiQuery({ name: 'outletId', required: true })
  @ApiQuery({ name: 'quantity', required: true, type: Number })
  async checkStock(
    @Query('productId') productId: string,
    @Query('variantId') variantId: string | undefined,
    @Query('outletId') outletId: string,
    @Query('quantity') quantity: number,
  ) {
    const inStock = await this.syncService.checkStock(
      productId,
      variantId || null,
      outletId,
      quantity,
    );
    return { productId, variantId, quantity, inStock };
  }

  @Post('shipping/calculate')
  @ApiOperation({
    summary: 'Calculate shipping cost based on zone (same-city / inter-city / inter-province)',
  })
  async calculateShipping(@Body() dto: ShippingCalculateDto) {
    return this.syncService.calculateShipping(dto.origin, dto.destination, dto.weight);
  }

  // ======================================================================
  // ORDER FULFILLMENT ENDPOINT
  // ======================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RequireFeature('online_store')
  @Put('orders/:id/fulfill')
  @ApiOperation({ summary: 'Mark order as fulfilled / shipped with tracking number' })
  async fulfillOrder(
    @Param('id') orderId: string,
    @Body() dto: OnlineOrderFulfillDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Verify order belongs to user's business
    const order = await this.prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { store: { select: { businessId: true } } },
    });
    if (!order || order.store.businessId !== user.businessId) {
      throw new NotFoundException('Order not found');
    }
    return this.syncService.fulfillOrder(
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @RequireFeature('online_store')
  @Post('stores/:storeId/sync-catalog')
  @ApiOperation({
    summary: 'Sync catalog from main POS to online store with stock availability check',
  })
  async syncCatalogEnhanced(@Param('storeId') storeId: string, @CurrentUser() user: AuthUser) {
    return this.onlineStoreService.syncCatalog(user.businessId, storeId);
  }

  // ======================================================================
  // STORE ANALYTICS
  // ======================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @RequireFeature('online_store')
  @Get('stores/:storeId/analytics')
  @ApiOperation({ summary: 'Get store analytics: orders, revenue, popular products' })
  async getStoreAnalytics(@Param('storeId') storeId: string, @CurrentUser() user: AuthUser) {
    return this.onlineStoreService.getStoreAnalytics(user.businessId, storeId);
  }

  // ======================================================================
  // STORE INVENTORY STATUS
  // ======================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  @RequireFeature('online_store')
  @Get('stores/:storeId/inventory')
  @ApiOperation({
    summary: 'Get inventory status for store products (in stock, low stock, out of stock)',
  })
  async getStoreInventory(@Param('storeId') storeId: string, @CurrentUser() user: AuthUser) {
    return this.onlineStoreService.getStoreInventory(user.businessId, storeId);
  }

  // ======================================================================
  // UPDATE STORE SETTINGS
  // ======================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @RequireFeature('online_store')
  @Put('stores/:storeId/settings')
  @ApiOperation({ summary: 'Update store settings (delivery radius, min order, fees)' })
  async updateStoreSettings(
    @Param('storeId') storeId: string,
    @Body() dto: StoreSettingsInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onlineStoreService.updateStoreSettings(user.businessId, storeId, dto);
  }

  // ======================================================================
  // SHIPPING CALCULATOR (distance-based with store settings)
  // ======================================================================

  @Post('stores/:storeId/shipping/calculate')
  @ApiOperation({ summary: 'Calculate shipping cost for an order' })
  async calculateStoreShipping(
    @Param('storeId') storeId: string,
    @Body() dto: { destination: string; weight: number },
  ) {
    return this.onlineStoreService.calculateShipping(storeId, dto.destination, dto.weight);
  }

  @Get('stores/:storeId/delivery-zones')
  @ApiOperation({ summary: 'Get delivery zones for a store' })
  async getDeliveryZones(@Param('storeId') storeId: string) {
    return this.onlineStoreService.getDeliveryZones(storeId);
  }

  // ======================================================================
  // PUBLIC STOREFRONT API (no auth required)
  // ======================================================================

  @Get('s/:slug/storefront')
  @ApiOperation({ summary: 'Get public storefront data (no auth)' })
  async getStorefrontData(@Param('slug') slug: string) {
    return this.onlineStoreService.getStorefrontData(slug);
  }

  @Get('s/:slug/products/:productId')
  @ApiOperation({ summary: 'Get public product detail (no auth)' })
  async getStorefrontProduct(@Param('slug') slug: string, @Param('productId') productId: string) {
    return this.onlineStoreService.getStorefrontProduct(slug, productId);
  }

  @Post('s/:slug/checkout')
  @ApiOperation({ summary: 'Public checkout - place an order (no auth)' })
  async storefrontCheckout(@Param('slug') slug: string, @Body() dto: StorefrontOrderInput) {
    return this.onlineStoreService.createStorefrontOrder(slug, dto);
  }
}
