/**
 * Xendit QRIS Service (dynamic QR codes).
 *
 * NOTE: uses the legacy QR Codes API shape (external_id + callback_url on
 * POST /qr_codes); not verified against a sandbox in this codebase.
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type { XenditQRCodeRequest, XenditQRCodeResponse, XenditConfig } from '../types';
import { XENDIT_ENDPOINTS, formatXenditRef } from '../types';

export class XenditQRISService extends XenditBaseService {
  constructor(config: XenditConfig) {
    super(config, 'XenditQRISService');
  }

  async createPayment(input: PaymentInput, externalId: string): Promise<PaymentResult> {
    const payload: XenditQRCodeRequest = {
      external_id: externalId,
      type: 'DYNAMIC',
      callback_url: this.config.webhookUrl,
      amount: input.amount,
      currency: 'IDR',
    };

    const response = await this.post<XenditQRCodeResponse>(
      this.buildUrl(XENDIT_ENDPOINTS.qrcode),
      payload,
    );

    this.logger.log(`QRIS payment created: ${response.id} (${externalId})`);

    return {
      success: true,
      transactionRef: formatXenditRef('qris', response.id),
      paymentData: {
        paymentStatus: 'pending',
        qrString: response.qr_string,
        expiresAt: response.expiry_date,
        amount: response.amount,
        type: 'QRIS',
      },
      message: 'QRIS payment created. Scan QR code to pay.',
    };
  }

  async getStatus(qrCodeId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditQRCodeResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.qrcode}/${qrCodeId}`),
    );

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      ACTIVE: 'pending',
      INACTIVE: 'pending',
      EXPIRED: 'failed',
    };
    return statusMap[response.status] ?? 'pending';
  }
}
