import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Headers,
  Req,
  ParseUUIDPipe,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { CreateSelfOrderSessionUseCase } from '../../application/use-cases/self-order/create-session.use-case';
import { SelfOrderPaymentService } from './self-order-payment.service';
import { SelfOrderScheduler } from './self-order.scheduler';
import { SelfOrderSessionService } from './self-order-session.service';
import {
  AddSelfOrderItemDto,
  CreateSelfOrderSessionDto,
  ExtendSelfOrderSessionDto,
  MenuTranslationBatchDto,
  SelfOrderLanguageQueryDto,
  SelfOrderMenuQueryDto,
  SelfOrderPaymentCallbackAltDto,
  SelfOrderPaymentCallbackDto,
  SelfOrderPaymentDto,
  SelfOrderQrisPaymentDto,
} from '../../application/dtos/self-order-features.dto';
import { getTranslations, getSupportedLocales, isSupportedLocale } from './i18n';
import { Public } from '@shared/decorators/public.decorator';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '@shared/constants/roles';

/** Rate limits for anonymous endpoints (named throttlers from throttle.config.ts). */
const PUBLIC_WRITE_LIMIT = { short: { limit: 3, ttl: 1000 }, long: { limit: 30, ttl: 60000 } };
const PUBLIC_SESSION_CREATE_LIMIT = {
  short: { limit: 2, ttl: 1000 },
  long: { limit: 10, ttl: 60000 },
};
const PUBLIC_READ_LIMIT = { short: { limit: 10, ttl: 1000 }, long: { limit: 120, ttl: 60000 } };
const WEBHOOK_LIMIT = { long: { limit: 60, ttl: 60000 } };

@ApiTags('Self Order')
@Controller('self-order')
export class SelfOrderController {
  constructor(
    private readonly createSessionUseCase: CreateSelfOrderSessionUseCase,
    private readonly sessions: SelfOrderSessionService,
    private readonly paymentService: SelfOrderPaymentService,
    private readonly scheduler: SelfOrderScheduler,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('sessions')
  @Throttle(PUBLIC_SESSION_CREATE_LIMIT)
  @ApiOperation({ summary: 'Create a new self-order session' })
  async createSession(@Body() dto: CreateSelfOrderSessionDto) {
    return this.createSessionUseCase.execute(dto);
  }

  @Public()
  @Get('sessions/:code')
  @Throttle(PUBLIC_READ_LIMIT)
  @ApiOperation({ summary: 'Get session by code (public-safe fields only)' })
  async getSession(@Param('code') code: string) {
    return this.sessions.getPublicSession(code);
  }

  @Public()
  @Get('menu')
  @Throttle(PUBLIC_READ_LIMIT)
  @ApiOperation({ summary: 'Get menu for outlet' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (id, en). Defaults to id.',
  })
  async getMenu(@Query() query: SelfOrderMenuQueryDto) {
    return this.sessions.getMenu(query.outletId, query.lang);
  }

  @Public()
  @Post('sessions/:code/items')
  @Throttle(PUBLIC_WRITE_LIMIT)
  @ApiOperation({ summary: 'Add item to session' })
  async addItem(@Param('code') code: string, @Body() dto: AddSelfOrderItemDto) {
    return this.sessions.addItem(code, dto);
  }

  @Public()
  @Post('sessions/:code/submit')
  @Throttle(PUBLIC_WRITE_LIMIT)
  @ApiOperation({ summary: 'Submit session order (creates exactly one kitchen order)' })
  async submitSession(@Param('code') code: string) {
    return this.sessions.submitSession(code);
  }

  // Payment endpoints
  @Public()
  @Get('sessions/:code/total')
  @Throttle(PUBLIC_READ_LIMIT)
  @ApiOperation({ summary: 'Calculate session total' })
  async getSessionTotal(@Param('code') code: string) {
    return this.paymentService.calculateSessionTotal(code);
  }

  @Public()
  @Post('sessions/:code/pay')
  @Throttle(PUBLIC_WRITE_LIMIT)
  @ApiOperation({
    summary: 'Create payment for session',
    description:
      'Only cash (pay at counter) is supported; digital methods return 501 NOT_CONFIGURED.',
  })
  async createPayment(@Param('code') code: string, @Body() dto: SelfOrderPaymentDto) {
    return this.paymentService.createPayment({
      sessionCode: code,
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
    });
  }

  @Public()
  @Get('sessions/:code/payment-status')
  @Throttle(PUBLIC_READ_LIMIT)
  @ApiOperation({ summary: 'Get payment status' })
  async getPaymentStatus(@Param('code') code: string) {
    return this.paymentService.getPaymentStatus(code);
  }

  @Public()
  @Post('payment/callback')
  @Throttle(WEBHOOK_LIMIT)
  @ApiOperation({ summary: 'Payment callback webhook' })
  async paymentCallback(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
    @Body() dto: SelfOrderPaymentCallbackDto,
  ) {
    this.verifyWebhookSignature(signature, req, dto);
    await this.paymentService.handlePaymentCallback(dto.orderId, dto.status);
    return { received: true };
  }

  // ==================== Multi-language Menu ====================

  @Public()
  @Get('menu/:outletId')
  @Throttle(PUBLIC_READ_LIMIT)
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
  async getMenuWithLanguage(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: SelfOrderLanguageQueryDto,
  ) {
    return this.sessions.getMenuWithLanguage(outletId, query.lang);
  }

  // ==================== Menu Translations Management ====================

  @Post('menu/translations')
  @ApiBearerAuth()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Set menu item translations',
    description:
      'Store translations for product names and descriptions of the caller business. Translations are embedded in the product description as a JSON structure.',
  })
  async setMenuTranslations(@CurrentUser() user: AuthUser, @Body() dto: MenuTranslationBatchDto) {
    return this.sessions.setMenuTranslations(user, dto);
  }

  // ==================== Session Management ====================

  @Public()
  @Put('sessions/:code/extend')
  @Throttle(PUBLIC_WRITE_LIMIT)
  @ApiOperation({ summary: 'Extend an active session (bounded total lifetime)' })
  async extendSession(@Param('code') code: string, @Body() dto: ExtendSelfOrderSessionDto) {
    return this.scheduler.extendSession(code, dto.minutes);
  }

  // ==================== QRIS Payment Shortcut ====================

  @Public()
  @Post('sessions/:code/pay/qris')
  @Throttle(PUBLIC_WRITE_LIMIT)
  @ApiOperation({ summary: 'Initiate QRIS payment for session (501: not configured)' })
  async initiateQrisPayment(@Param('code') code: string, @Body() dto: SelfOrderQrisPaymentDto) {
    return this.paymentService.initiateQRISPayment(code, dto.amount);
  }

  // ==================== Payment Callback (webhook) ====================

  @Public()
  @Post('payment-callback')
  @Throttle(WEBHOOK_LIMIT)
  @ApiOperation({ summary: 'Payment callback webhook (alternative path, same handler)' })
  async paymentCallbackAlt(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
    @Body() dto: SelfOrderPaymentCallbackAltDto,
  ) {
    this.verifyWebhookSignature(signature, req, dto);
    await this.paymentService.handlePaymentCallback(dto.paymentId, dto.status);
    return { received: true };
  }

  // ==================== i18n Translations ====================

  @Public()
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

  /**
   * HMAC over the raw request body when available (rawBody must be enabled in
   * main.ts); falls back to the re-serialized JSON body otherwise.
   */
  private verifyWebhookSignature(
    signature: string,
    req: RawBodyRequest<Request>,
    body: object,
  ): void {
    const webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new UnauthorizedException('Webhook verification not configured');
    }
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(body));
    const expectedSignature = createHmac('sha256', webhookSecret).update(payload).digest('hex');
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
