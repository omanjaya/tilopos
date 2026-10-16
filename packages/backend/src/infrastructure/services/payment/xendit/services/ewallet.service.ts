/**
 * Xendit E-Wallet Service (GoPay via partners, OVO, DANA, ShopeePay, LinkAja).
 *
 * NOTE: uses the E-Wallet Charges API (POST/GET /ewallets/charges) per the
 * public API reference; not verified against a sandbox in this codebase.
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type {
  XenditEwalletChargeRequest,
  XenditEwalletChargeResponse,
  XenditConfig,
} from '../types';
import { XENDIT_ENDPOINTS, formatXenditRef } from '../types';

const CHANNEL_CODES: Record<string, string> = {
  OVO: 'ID_OVO',
  DANA: 'ID_DANA',
  SHOPEEPAY: 'ID_SHOPEEPAY',
  LINKAJA: 'ID_LINKAJA',
  GOPAY: 'ID_GOPAY',
};

export class XenditEwalletService extends XenditBaseService {
  constructor(config: XenditConfig) {
    super(config, 'XenditEwalletService');
  }

  async createPayment(
    input: PaymentInput,
    referenceId: string,
    ewalletType: string,
  ): Promise<PaymentResult> {
    const channelCode = CHANNEL_CODES[ewalletType.toUpperCase()];
    if (!channelCode) {
      return {
        success: false,
        transactionRef: '',
        message: `Unsupported e-wallet: ${ewalletType}. Supported: ${Object.keys(CHANNEL_CODES).join(', ')}`,
        paymentData: { paymentStatus: 'failed' },
      };
    }

    if (channelCode === 'ID_OVO' && !input.customer?.phone) {
      return {
        success: false,
        transactionRef: '',
        message: 'Phone number is required for OVO payments',
        paymentData: { paymentStatus: 'failed' },
      };
    }

    const payload: XenditEwalletChargeRequest = {
      reference_id: referenceId,
      currency: 'IDR',
      amount: input.amount,
      checkout_method: 'ONE_TIME_PAYMENT',
      channel_code: channelCode,
      channel_properties: {
        ...(input.customer?.phone
          ? { mobile_number: this.normalizePhoneNumber(input.customer.phone) }
          : {}),
        ...(this.config.webhookUrl ? { success_redirect_url: this.config.webhookUrl } : {}),
      },
    };

    const response = await this.post<XenditEwalletChargeResponse>(
      this.buildUrl(XENDIT_ENDPOINTS.ewallet),
      payload,
    );

    this.logger.log(`E-wallet charge created: ${response.id} (${ewalletType})`);

    return {
      success: true,
      transactionRef: formatXenditRef('ewallet', response.id),
      paymentData: {
        paymentStatus: this.mapStatus(response.status),
        checkoutUrl:
          response.actions?.mobile_web_checkout_url ??
          response.actions?.desktop_web_checkout_url ??
          response.actions?.mobile_deeplink_checkout_url ??
          null,
        qrString: response.actions?.qr_checkout_string ?? null,
        amount: response.charge_amount,
        ewalletType,
        type: 'EWALLET',
      },
      message: `Complete the payment in ${ewalletType}`,
    };
  }

  async getStatus(chargeId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditEwalletChargeResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.ewallet}/${chargeId}`),
    );
    return this.mapStatus(response.status);
  }

  private mapStatus(status: XenditEwalletChargeResponse['status']): PaymentStatus {
    switch (status) {
      case 'SUCCEEDED':
        return 'completed';
      case 'FAILED':
      case 'VOIDED':
        return 'failed';
      case 'REFUNDED':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }
    return '+' + normalized;
  }
}
