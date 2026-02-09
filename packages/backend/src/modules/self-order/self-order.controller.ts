import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreateSelfOrderSessionUseCase } from '../../application/use-cases/self-order/create-session.use-case';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import { SelfOrderPaymentService } from './self-order-payment.service';
import { SelfOrderScheduler } from './self-order.scheduler';
import { MenuTranslationBatchDto } from '../../application/dtos/self-order-features.dto';
import { getTranslations, getSupportedLocales, isSupportedLocale } from './i18n';
import { AppError, ErrorCode } from '../../shared/errors/app-error';

@ApiTags('Self Order')
@Controller('self-order')
export class SelfOrderController {
  constructor(
    private readonly createSessionUseCase: CreateSelfOrderSessionUseCase,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly paymentService: SelfOrderPaymentService,
    private readonly scheduler: SelfOrderScheduler,
  ) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new self-order session' })
  async createSession(@Body() dto: { outletId: string; tableId?: string; language?: string }) {
    return this.createSessionUseCase.execute(dto);
  }

  @Get('sessions/:code')
  @ApiOperation({ summary: 'Get session by code' })
  async getSession(@Param('code') code: string) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: code },
      include: {
        items: { include: { product: true } },
        table: true,
        outlet: {
          select: { id: true, name: true },
        },
      },
    });

    if (!session) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Session not found or expired',
      );
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      throw new AppError(
        ErrorCode.SESSION_EXPIRED,
        'Session has expired',
      );
    }

    return {
      ...session,
      outletName: session.outlet.name,
      tableNumber: session.table?.name,
    };
  }

  @Get('menu')
  @ApiOperation({ summary: 'Get menu for outlet' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (id, en). Defaults to id.',
  })
  async getMenu(@Query('outletId') outletId: string, @Query('lang') lang?: string) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true, name: true },
    });
    if (!outlet) return [];

    const products = await this.prisma.product.findMany({
      where: { businessId: outlet.businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    const language = lang || 'id';
    const i18nStrings = getTranslations(language);

    // Transform to menu items with pricing and localization
    return products.map((product) => {
      // Get base price from product
      const basePrice = Number(product.basePrice);
      const variants = product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
      }));

      // Use the lowest variant price if available, otherwise base price
      const price = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : basePrice;

      // Try to get localized product name/description
      let productName = product.name;
      let productDescription = product.description;
      if (language !== 'id' && product.description) {
        try {
          const parsed = JSON.parse(product.description);
          if (parsed.translations && parsed.translations[language]) {
            productName = parsed.translations[language].name || product.name;
            productDescription = parsed.translations[language].description || null;
          }
        } catch {
          // Not JSON, use as-is
        }
      }

      // Localize category name -- use i18n "all categories" for missing
      const categoryName = product.category?.name || i18nStrings.menu.allCategories;

      return {
        id: product.id,
        name: productName,
        description: productDescription,
        price,
        imageUrl: product.imageUrl,
        categoryName,
        isAvailable: true, // Could add stock check here
        variants: variants.length > 0 ? variants : undefined,
      };
    });
  }

  @Post('sessions/:code/items')
  @ApiOperation({ summary: 'Add item to session' })
  async addItem(
    @Param('code') code: string,
    @Body()
    dto: {
      productId: string;
      variantId?: string;
      quantity: number;
      modifiers?: unknown[];
      notes?: string;
    },
  ) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: code },
      include: { outlet: true },
    });
    if (!session) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Session not found',
      );
    }

    // Check if session is still active
    if (session.status !== 'active') {
      throw new AppError(
        ErrorCode.SESSION_EXPIRED,
        'Session is not active',
      );
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      throw new AppError(
        ErrorCode.SESSION_EXPIRED,
        'Session has expired',
      );
    }

    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: true },
    });

    if (!product) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Product not found',
      );
    }

    // Validate variant if provided
    if (dto.variantId) {
      const variant = product.variants.find((v) => v.id === dto.variantId);
      if (!variant) {
        throw new AppError(
          ErrorCode.RESOURCE_NOT_FOUND,
          'Variant not found',
        );
      }
    }

    return this.prisma.selfOrderItem.create({
      data: {
        sessionId: session.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
        quantity: dto.quantity,
        modifiers: (dto.modifiers as never) || [],
        notes: dto.notes || null,
      },
    });
  }

  @Post('sessions/:code/submit')
  @ApiOperation({ summary: 'Submit session order' })
  async submitSession(@Param('code') code: string) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: code },
      include: { items: true, outlet: true, table: true },
    });

    if (!session) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Session not found',
      );
    }

    if (session.items.length === 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot submit empty order',
      );
    }

    // Update session status
    await this.prisma.selfOrderSession.update({
      where: { sessionCode: code },
      data: { status: 'submitted' },
    });

    // Create order from session
    const orderNumber = await this.generateOrderNumber(session.outletId);

    const order = await this.prisma.order.create({
      data: {
        outletId: session.outletId,
        orderNumber,
        orderType: 'dine_in',
        tableId: session.tableId,
        status: 'pending',
      },
    });

    // Create order items from session items
    for (const item of session.items) {
      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productId, // Will be resolved in actual implementation
          quantity: item.quantity,
          notes: item.notes,
          status: 'pending',
        },
      });
    }

    // Emit event so KDS picks up the new order
    this.eventBus.publish(
      new OrderStatusChangedEvent(order.id, session.outletId, 'none', 'pending'),
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber,
    };
  }

  // Payment endpoints
  @Get('sessions/:code/total')
  @ApiOperation({ summary: 'Calculate session total' })
  async getSessionTotal(@Param('code') code: string) {
    return this.paymentService.calculateSessionTotal(code);
  }

  @Post('sessions/:code/pay')
  @ApiOperation({ summary: 'Create payment for session' })
  async createPayment(
    @Param('code') code: string,
    @Body()
    dto: {
      paymentMethod: 'qris' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';
      amount: number;
      customerEmail?: string;
      customerPhone?: string;
    },
  ) {
    return this.paymentService.createPayment({
      sessionCode: code,
      ...dto,
    });
  }

  @Get('sessions/:code/payment-status')
  @ApiOperation({ summary: 'Get payment status' })
  async getPaymentStatus(@Param('code') code: string) {
    return this.paymentService.getPaymentStatus(code);
  }

  @Post('payment/callback')
  @ApiOperation({ summary: 'Payment callback webhook' })
  async paymentCallback(
    @Body() dto: { orderId: string; status: 'success' | 'failed' | 'pending' },
  ) {
    await this.paymentService.handlePaymentCallback(dto.orderId, dto.status);
    return { received: true };
  }

  // ==================== Multi-language Menu ====================

  @Get('menu/:outletId')
  @ApiOperation({
    summary: 'Get menu for self-order with language support',
    description:
      'Returns menu items with translations for the specified language. Falls back to default product name/description if no translation exists.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (id, en). Defaults to id.',
  })
  async getMenuWithLanguage(@Param('outletId') outletId: string, @Query('lang') lang?: string) {
    const language = lang || 'id';

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true, name: true, settings: true },
    });

    if (!outlet) {
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Outlet not found',
      );
    }

    const products = await this.prisma.product.findMany({
      where: { businessId: outlet.businessId, isActive: true },
      include: {
        variants: { where: { isActive: true } },
        category: true,
        productModifierGroups: {
          include: {
            modifierGroup: {
              include: { modifiers: { where: { isActive: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Group by category for better UX
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        sortOrder: number;
        products: Array<{
          id: string;
          name: string;
          description?: string;
          price: number;
          imageUrl?: string;
          isAvailable: boolean;
          variants?: Array<{ id: string; name: string; price: number }>;
          modifierGroups?: Array<{
            id: string;
            name: string;
            isRequired: boolean;
            modifiers: Array<{ id: string; name: string; price: number }>;
          }>;
        }>;
      }
    >();

    for (const product of products) {
      const categoryId = product.categoryId || 'uncategorized';
      const categoryName = product.category?.name || 'Uncategorized';
      const categorySortOrder = product.category?.sortOrder ?? 999;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          sortOrder: categorySortOrder,
          products: [],
        });
      }

      // Apply translations from product settings/metadata if available
      // Translations are stored in product description as JSON: {"translations": {"en": {"name": "...", "description": "..."}}}
      let productName = product.name;
      let productDescription = product.description || undefined;

      // Check if product has translations stored (in a real app, this would be a separate table)
      // For now, we check the product's description for a JSON translation block
      if (language !== 'id' && product.description) {
        try {
          // Attempt to parse description as JSON with translations
          const parsed = JSON.parse(product.description);
          if (parsed.translations && parsed.translations[language]) {
            productName = parsed.translations[language].name || product.name;
            productDescription = parsed.translations[language].description || undefined;
          }
        } catch {
          // Not JSON, use as-is - it's a regular description
        }
      }

      const basePrice = Number(product.basePrice);
      const variants = product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
      }));

      const price = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : basePrice;

      const category = categoryMap.get(categoryId)!;
      category.products.push({
        id: product.id,
        name: productName,
        description: productDescription,
        price,
        imageUrl: product.imageUrl || undefined,
        isAvailable: true,
        variants: variants.length > 0 ? variants : undefined,
        modifierGroups:
          product.productModifierGroups.length > 0
            ? product.productModifierGroups.map((pmg) => ({
                id: pmg.modifierGroup.id,
                name: pmg.modifierGroup.name,
                isRequired: pmg.modifierGroup.isRequired,
                modifiers: pmg.modifierGroup.modifiers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.price),
                })),
              }))
            : undefined,
      });
    }

    // Sort categories and return
    const categories = Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      outletName: outlet.name,
      language,
      categories,
    };
  }

  // ==================== Menu Translations Management ====================

  @Post('menu/translations')
  @ApiOperation({
    summary: 'Set menu item translations',
    description:
      'Store translations for product names and descriptions. Translations are embedded in the product description as a JSON structure.',
  })
  async setMenuTranslations(@Body() dto: MenuTranslationBatchDto) {
    const results: Array<{ productId: string; success: boolean; error?: string }> = [];

    for (const item of dto.items) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, description: true },
        });

        if (!product) {
          results.push({ productId: item.productId, success: false, error: 'Product not found' });
          continue;
        }

        // Build translation-embedded description
        let existingData: Record<string, unknown> = {};
        if (product.description) {
          try {
            existingData = JSON.parse(product.description);
          } catch {
            // Current description is plain text, preserve it as the default
            existingData = { defaultDescription: product.description };
          }
        }

        existingData.translations = {
          ...((existingData.translations as Record<string, unknown>) || {}),
          ...item.translations,
        };

        await this.prisma.product.update({
          where: { id: item.productId },
          data: { description: JSON.stringify(existingData) },
        });

        results.push({ productId: item.productId, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ productId: item.productId, success: false, error: message });
      }
    }

    return { results };
  }

  // ==================== Session Management ====================

  @Put('sessions/:code/extend')
  @ApiOperation({ summary: 'Extend session expiry time' })
  async extendSession(@Param('code') code: string, @Body() dto: { minutes?: number }) {
    return this.scheduler.extendSession(code, dto.minutes);
  }

  // ==================== QRIS Payment Shortcut ====================

  @Post('sessions/:code/pay/qris')
  @ApiOperation({ summary: 'Initiate QRIS payment for session' })
  async initiateQrisPayment(@Param('code') code: string, @Body() dto: { amount: number }) {
    if (!dto.amount || dto.amount <= 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Amount must be greater than 0',
      );
    }
    return this.paymentService.initiateQRISPayment(code, dto.amount);
  }

  // ==================== Payment Callback (webhook) ====================

  @Post('payment-callback')
  @ApiOperation({ summary: 'Payment callback webhook (alternative path)' })
  async paymentCallbackAlt(
    @Body()
    dto: {
      sessionCode: string;
      paymentId: string;
      status: 'success' | 'failed' | 'pending';
    },
  ) {
    await this.paymentService.handlePaymentCallback(dto.paymentId, dto.status);
    return { received: true };
  }

  // ==================== i18n Translations ====================

  @Get('i18n/:locale')
  @ApiOperation({
    summary: 'Get UI translations for a locale',
    description:
      'Returns translation strings for the self-order UI. Supported locales: id (Indonesian), en (English).',
  })
  @ApiParam({ name: 'locale', description: 'Language code (id or en)', example: 'id' })
  async getTranslationsEndpoint(@Param('locale') locale: string) {
    if (!isSupportedLocale(locale)) {
      return {
        locale,
        fallback: 'id',
        supportedLocales: getSupportedLocales(),
        translations: getTranslations('id'),
      };
    }

    return {
      locale,
      supportedLocales: getSupportedLocales(),
      translations: getTranslations(locale),
    };
  }

  private async generateOrderNumber(outletId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.order.count({
      where: {
        outletId,
        createdAt: { gte: today },
      },
    });

    return `ORD-${today.getFullYear().toString().slice(-2)}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${String(count + 1).padStart(3, '0')}`;
  }
}
