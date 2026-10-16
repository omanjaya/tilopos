import {
  BadRequestException,
  Controller,
  createParamDecorator,
  ExecutionContext,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { HandleMidtransWebhookUseCase } from '../../application/use-cases/payments/handle-midtrans-webhook.use-case';
import { HandleXenditWebhookUseCase } from '../../application/use-cases/payments/handle-xendit-webhook.use-case';
import type { XenditWebhookRoute } from '../../application/use-cases/payments/xendit-webhook.mapper';
import { MidtransWebhookDto } from '../../application/dtos/midtrans-webhook.dto';
import { XenditWebhookDto } from '../../application/dtos/xendit-webhook.dto';
import { WebhookGuard } from '../../shared/guards/webhook.guard';
import { Public } from '@shared/decorators/public.decorator';

/**
 * Validates a gateway callback body against `dto` with whitelist ON but
 * forbidNonWhitelisted OFF: fields we use are validated, undocumented extras
 * that gateways add are stripped instead of rejecting the callback with 400.
 * (A custom param decorator is not run through the global ValidationPipe,
 * whose forbidNonWhitelisted would reject real Xendit/Midtrans payloads.)
 */
export const WebhookPayload = createParamDecorator(
  async (dto: ClassConstructor<object>, ctx: ExecutionContext) => {
    const body: unknown = ctx.switchToHttp().getRequest<{ body: unknown }>().body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Webhook body must be a JSON object');
    }
    const instance = plainToInstance(dto, body);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ') ||
          'Invalid webhook body',
      );
    }
    return instance;
  },
);

/**
 * Payment gateway callbacks. Authenticated by WebhookGuard (Midtrans SHA-512
 * signature / Xendit callback token, constant time, fail closed).
 *
 * Response semantics: 2xx = processed or intentionally ignored (duplicates,
 * pending, amount mismatch — which is flagged on the payment and in the audit
 * log for manual follow-up, since retrying would not change it). Unknown
 * payment references (404) and processing errors (5xx) are non-2xx so the
 * gateway retries and the failure is visible.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly handleMidtransWebhook: HandleMidtransWebhookUseCase,
    private readonly handleXenditWebhook: HandleXenditWebhookUseCase,
  ) {}

  @Public()
  @Post('webhook/midtrans')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Handle Midtrans webhook notification' })
  async midtransWebhook(@WebhookPayload(MidtransWebhookDto) dto: MidtransWebhookDto) {
    this.logger.log(`Midtrans webhook received: order=${dto.order_id}, status=${dto.status_code}`);

    const result = await this.handleMidtransWebhook.execute({
      orderId: dto.order_id,
      statusCode: dto.status_code,
      grossAmount: dto.gross_amount,
      signatureKey: dto.signature_key,
      transactionId: dto.transaction_id ?? '',
      transactionStatus: dto.transaction_status,
      fraudStatus: dto.fraud_status,
    });

    return { success: result.success, code: result.code, message: 'Webhook processed' };
  }

  @Public()
  @Post('webhook/xendit')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Handle Xendit webhook notification' })
  @ApiHeader({ name: 'x-callback-token', description: 'Xendit callback verification token' })
  async xenditWebhook(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('generic', dto);
  }

  @Public()
  @Post('xendit/callback')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Alternative Xendit callback endpoint' })
  async xenditCallback(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('generic', dto);
  }

  @Public()
  @Post('xendit/invoice')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit invoice callback (flat payload, no event field)' })
  async xenditInvoiceWebhook(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('invoice', dto);
  }

  @Public()
  @Post('xendit/qris')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit QR code payment callback' })
  async xenditQrisWebhook(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('qris', dto);
  }

  @Public()
  @Post('xendit/va')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit fixed virtual account payment callback' })
  async xenditVAWebhook(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('va', dto);
  }

  @Public()
  @Post('xendit/ewallet')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit e-wallet charge callback' })
  async xenditEwalletWebhook(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('ewallet', dto);
  }

  @Public()
  @Post('xendit/retail')
  @HttpCode(200)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit retail outlet payment callback' })
  async xenditRetailWebhook(@WebhookPayload(XenditWebhookDto) dto: XenditWebhookDto) {
    return this.processXendit('retail', dto);
  }

  private async processXendit(route: XenditWebhookRoute, dto: XenditWebhookDto) {
    this.logger.log(
      `Xendit ${route} webhook received: event=${dto.event ?? '-'}, id=${dto.id ?? '-'}`,
    );
    const result = await this.handleXenditWebhook.execute(route, dto);
    return {
      success: result.success,
      code: result.code,
      message: result.message ?? 'Webhook processed',
    };
  }
}
