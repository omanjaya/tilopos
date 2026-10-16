import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { XenditWebhookDto } from '../../dtos/xendit-webhook.dto';
import { PaymentWebhookProcessor, type WebhookResultCode } from './payment-webhook.processor';
import { normalizeXenditWebhook, type XenditWebhookRoute } from './xendit-webhook.mapper';

export interface HandleXenditWebhookResult {
  success: boolean;
  code: WebhookResultCode;
  event: string;
  externalId: string;
  message?: string;
}

/**
 * Xendit callbacks. The callback token is verified by WebhookGuard (constant
 * time, fail closed). The payment is located by our own id sent as
 * external_id / reference_id; amount and state transitions are enforced by
 * PaymentWebhookProcessor. Processing errors propagate as non-2xx so Xendit
 * retries; an unknown reference is answered with 404 for the same reason.
 */
@Injectable()
export class HandleXenditWebhookUseCase {
  private readonly logger = new Logger(HandleXenditWebhookUseCase.name);

  constructor(private readonly processor: PaymentWebhookProcessor) {}

  async execute(
    route: XenditWebhookRoute,
    body: XenditWebhookDto,
  ): Promise<HandleXenditWebhookResult> {
    const n = normalizeXenditWebhook(route, body);
    if (!n) {
      this.logger.log(`Xendit ${route} callback without payment state change acknowledged`);
      return {
        success: true,
        code: 'ignored',
        event: body.event ?? route,
        externalId: body.external_id ?? '',
      };
    }
    if (!n.reference) {
      this.logger.error(`Xendit ${n.event} callback without a reference; cannot be matched`);
      throw new NotFoundException('Callback carries no payment reference');
    }

    const result = await this.processor.process({
      provider: 'xendit',
      reference: n.reference,
      outcome: n.outcome,
      amount: n.amount,
      gatewayRef: n.gatewayRef,
      event: n.event,
    });

    if (result.code === 'not_found') {
      throw new NotFoundException(`Payment not found for reference ${n.reference}`);
    }

    this.logger.log(`Xendit ${n.event} for ${n.reference}: ${result.code} (${result.message})`);
    return {
      success: result.code !== 'amount_mismatch',
      code: result.code,
      event: n.event,
      externalId: n.reference,
      message: result.message,
    };
  }
}
