import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';
import {
  PaymentWebhookProcessor,
  type WebhookOutcome,
  type WebhookResultCode,
} from './payment-webhook.processor';

export interface HandleWebhookParams {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  transactionId: string;
  transactionStatus: string;
  fraudStatus?: string;
}

export interface HandleWebhookResult {
  success: boolean;
  code: WebhookResultCode;
  transactionStatus: string;
  transactionId: string;
  orderId: string;
}

/**
 * Midtrans HTTP notification. `order_id` is our Payment id (see
 * ProcessMultiPaymentUseCase). Amount and state transitions are enforced by
 * PaymentWebhookProcessor; processing errors propagate as non-2xx so Midtrans
 * retries.
 */
@Injectable()
export class HandleMidtransWebhookUseCase {
  private readonly logger = new Logger(HandleMidtransWebhookUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly processor: PaymentWebhookProcessor,
  ) {}

  async execute(params: HandleWebhookParams): Promise<HandleWebhookResult> {
    this.verifySignature(params);

    const outcome = this.mapOutcome(params.transactionStatus, params.fraudStatus);
    const result = await this.processor.process({
      provider: 'midtrans',
      reference: params.orderId,
      outcome,
      // For refunds Midtrans reports the refunded amount elsewhere; gross_amount
      // is the original charge, which is what completion is checked against.
      amount: params.grossAmount,
      gatewayRef: params.transactionId,
      event: params.transactionStatus,
    });

    if (result.code === 'not_found') {
      // Non-2xx: Midtrans retries, and the miss is visible in logs/alerts.
      throw new NotFoundException(`Payment not found for order ${params.orderId}`);
    }

    this.logger.log(
      `Midtrans ${params.transactionStatus} for order ${params.orderId}: ${result.code} (${result.message})`,
    );

    return {
      success:
        result.code === 'applied' || result.code === 'duplicate' || result.code === 'ignored',
      code: result.code,
      transactionStatus: params.transactionStatus,
      transactionId: params.transactionId,
      orderId: params.orderId,
    };
  }

  /** Defence in depth: WebhookGuard verifies too; this never runs unverified. */
  private verifySignature(params: HandleWebhookParams): void {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      this.logger.error('MIDTRANS_SERVER_KEY not configured - rejecting webhook');
      throw new AppError(ErrorCode.UNAUTHORIZED_ACTION, 'Webhook verification not configured');
    }
    if (!params.signatureKey) {
      throw new AppError(ErrorCode.UNAUTHORIZED_ACTION, 'Missing webhook signature');
    }
    const expected = Buffer.from(
      createHash('sha512')
        .update(`${params.orderId}${params.statusCode}${params.grossAmount}${serverKey}`)
        .digest('hex'),
    );
    const given = Buffer.from(String(params.signatureKey));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      this.logger.error(`Invalid webhook signature for order ${params.orderId}`);
      throw new AppError(ErrorCode.UNAUTHORIZED_ACTION, 'Invalid webhook signature');
    }
  }

  /**
   * capture + fraud_status=challenge stays pending (manual review in the
   * Midtrans dashboard), deny is a failure, partial_refund never refunds the
   * whole payment.
   */
  mapOutcome(transactionStatus: string, fraudStatus?: string): WebhookOutcome {
    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        if (fraudStatus === 'challenge') return 'pending';
        if (fraudStatus === 'deny') return 'failed';
        return 'completed';
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return 'failed';
      case 'refund':
        return 'refunded';
      case 'partial_refund':
        return 'partially_refunded';
      default:
        return 'pending';
    }
  }
}
