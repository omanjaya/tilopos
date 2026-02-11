import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { HandleMidtransWebhookUseCase } from '../../application/use-cases/payments/handle-midtrans-webhook.use-case';
import { HandleXenditWebhookUseCase } from '../../application/use-cases/payments/handle-xendit-webhook.use-case';
import { MidtransWebhookDto } from '../../application/dtos/midtrans-webhook.dto';
import { XenditWebhookDto } from '../../application/dtos/xendit-webhook.dto';
import { WebhookGuard } from '../../shared/guards/webhook.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly handleMidtransWebhook: HandleMidtransWebhookUseCase,
    private readonly handleXenditWebhook: HandleXenditWebhookUseCase,
  ) {}

  // ===========================================================================
  // Midtrans Webhook
  // ===========================================================================

  @Post('webhook/midtrans')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Handle Midtrans webhook notification' })
  async midtransWebhook(@Body() dto: MidtransWebhookDto) {
    this.logger.log(`Midtrans webhook received: order=${dto.order_id}, status=${dto.status_code}`);

    const result = await this.handleMidtransWebhook.execute({
      orderId: dto.order_id,
      statusCode: dto.status_code,
      grossAmount: dto.gross_amount,
      signatureKey: dto.signature_key,
      transactionId: dto.transaction_id,
      transactionStatus: dto.transaction_status || 'pending',
      fraudStatus: dto.fraud_status,
    });

    // Always return 200 to Midtrans to acknowledge receipt
    return {
      success: result.success,
      message: 'Webhook processed',
    };
  }

  // ===========================================================================
  // Xendit Webhook
  // ===========================================================================

  @Post('webhook/xendit')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Handle Xendit webhook notification' })
  @ApiHeader({ name: 'x-callback-token', description: 'Xendit callback verification token' })
  async xenditWebhook(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
    @Req() _req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Xendit webhook received: event=${dto.event}, id=${dto.id || dto.external_id}`);

    // Note: Webhook authentication is handled by WebhookGuard
    // Extract relevant data from webhook payload
    const webhookData = this.extractXenditWebhookData(dto);

    const result = await this.handleXenditWebhook.execute({
      event: dto.event,
      externalId: webhookData.externalId,
      status: webhookData.status,
      amount: webhookData.amount,
      paymentMethod: webhookData.paymentMethod,
      paymentChannel: webhookData.paymentChannel,
      paidAt: webhookData.paidAt,
      rawPayload: dto as unknown as Record<string, unknown>,
    });

    // Always return 200 to Xendit to acknowledge receipt
    return {
      success: result.success,
      message: result.message || 'Webhook processed',
    };
  }

  // ===========================================================================
  // Xendit Alternative Webhook Endpoints
  // ===========================================================================

  @Post('xendit/callback')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Alternative Xendit callback endpoint' })
  async xenditCallback(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    return this.xenditWebhook(dto, callbackToken, {} as RawBodyRequest<Request>);
  }

  @Post('xendit/invoice')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit invoice webhook endpoint' })
  async xenditInvoiceWebhook(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    // Add invoice event if not present
    if (!dto.event) {
      dto.event = dto.status === 'PAID' ? 'invoice.paid' : 'invoice.expired';
    }
    return this.xenditWebhook(dto, callbackToken, {} as RawBodyRequest<Request>);
  }

  @Post('xendit/qris')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit QRIS webhook endpoint' })
  async xenditQrisWebhook(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    // Add QRIS event if not present
    if (!dto.event) {
      dto.event = dto.status === 'PAID' ? 'qr_code.paid' : 'qr_code.expired';
    }
    return this.xenditWebhook(dto, callbackToken, {} as RawBodyRequest<Request>);
  }

  @Post('xendit/va')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit Virtual Account webhook endpoint' })
  async xenditVAWebhook(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    // Add VA event if not present
    if (!dto.event) {
      dto.event = dto.status === 'PAID' ? 'fixed_payment_code.paid' : 'fixed_payment_code.expired';
    }
    return this.xenditWebhook(dto, callbackToken, {} as RawBodyRequest<Request>);
  }

  @Post('xendit/ewallet')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit E-Wallet webhook endpoint' })
  async xenditEwalletWebhook(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    // Add E-wallet event if not present
    if (!dto.event) {
      dto.event = dto.status === 'CAPTURED' ? 'ewallet.capture' : 'ewallet.void';
    }
    return this.xenditWebhook(dto, callbackToken, {} as RawBodyRequest<Request>);
  }

  @Post('xendit/retail')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Xendit Retail Outlet webhook endpoint' })
  async xenditRetailWebhook(
    @Body() dto: XenditWebhookDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    // Add retail event if not present
    if (!dto.event) {
      dto.event = dto.status === 'PAID' ? 'retail_outlet.paid' : 'retail_outlet.expired';
    }
    return this.xenditWebhook(dto, callbackToken, {} as RawBodyRequest<Request>);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private extractXenditWebhookData(dto: XenditWebhookDto): {
    externalId: string;
    status: string;
    amount: number;
    paymentMethod?: string;
    paymentChannel?: string;
    paidAt?: string;
  } {
    // Try to extract from nested objects first
    if (dto.invoice) {
      return {
        externalId: dto.invoice.external_id,
        status: dto.invoice.status,
        amount: dto.invoice.paid_amount || dto.invoice.amount,
        paymentMethod: dto.invoice.payment_method,
        paymentChannel: dto.invoice.payment_channel,
        paidAt: dto.invoice.paid_at,
      };
    }

    if (dto.qr_code) {
      return {
        externalId: dto.qr_code.external_id,
        status: dto.qr_code.status,
        amount: dto.qr_code.amount,
        paymentMethod: 'QRIS',
        paidAt: dto.qr_code.paid_at,
      };
    }

    if (dto.virtual_account) {
      return {
        externalId: dto.virtual_account.external_id,
        status: dto.virtual_account.status,
        amount: dto.virtual_account.amount || dto.virtual_account.expected_amount,
        paymentMethod: 'VA',
        paymentChannel: dto.virtual_account.bank_code,
        paidAt: dto.virtual_account.paid_at,
      };
    }

    if (dto.ewallet) {
      return {
        externalId: dto.ewallet.external_id,
        status: dto.ewallet.status,
        amount: dto.ewallet.amount,
        paymentMethod: 'EWALLET',
        paymentChannel: dto.ewallet.ewallet_type,
      };
    }

    if (dto.retail_outlet) {
      return {
        externalId: dto.retail_outlet.external_id,
        status: dto.retail_outlet.status,
        amount: dto.retail_outlet.amount || dto.retail_outlet.expected_amount,
        paymentMethod: 'RETAIL',
        paymentChannel: dto.retail_outlet.retail_outlet_name,
        paidAt: dto.retail_outlet.paid_at,
      };
    }

    if (dto.refund) {
      return {
        externalId: dto.refund.payment_id || dto.refund.invoice_id || dto.refund.id,
        status: dto.refund.status,
        amount: dto.refund.amount,
        paymentMethod: 'REFUND',
      };
    }

    // Fall back to top-level fields
    return {
      externalId: dto.external_id || dto.id || '',
      status: dto.status || 'PENDING',
      amount: dto.amount || 0,
      paymentMethod: dto.payment_method,
      paymentChannel: dto.payment_channel,
    };
  }
}
