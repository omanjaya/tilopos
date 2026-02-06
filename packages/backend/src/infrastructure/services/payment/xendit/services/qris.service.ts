/**
 * Xendit QRIS Service
 *
 * Handles QRIS (Quick Response Code Indonesian Standard) payments
 * Supports both static and dynamic QR codes
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type {
  XenditQRCodeRequest,
  XenditQRCodeResponse,
  XenditConfig,
  XenditRefundRequest,
  XenditRefundResponse,
} from '../types';
import { XENDIT_ENDPOINTS } from '../types';

export class XenditQRISService extends XenditBaseService {
  constructor(config: XenditConfig) {
    super(config, 'XenditQRISService');
  }

  /**
   * Create a dynamic QRIS payment
   */
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

    if (!response) {
      return {
        success: false,
        transactionRef: '',
        message: 'Failed to create QRIS payment',
      };
    }

    this.logger.log(`QRIS payment created: ${response.id} (${externalId})`);

    return {
      success: true,
      transactionRef: response.id,
      paymentData: {
        qrString: response.qr_string,
        expiresAt: response.expiry_date,
        amount: response.amount,
        type: 'QRIS',
      },
      message: 'QRIS payment created. Scan QR code to pay.',
    };
  }

  /**
   * Get QRIS payment status
   */
  async getStatus(qrCodeId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditQRCodeResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.qrcode}/${qrCodeId}`),
    );

    if (!response) {
      return 'pending';
    }

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      ACTIVE: 'pending',
      INACTIVE: 'pending',
      EXPIRED: 'failed',
    };

    return statusMap[response.status] || 'pending';
  }

  /**
   * Refund a QRIS payment
   */
  async refund(qrCodeId: string, amount: number, reason?: string): Promise<boolean> {
    const payload: XenditRefundRequest = { amount, reason };

    const response = await this.post<XenditRefundResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.qrcode}/${qrCodeId}/refunds`),
      payload,
    );

    if (!response) {
      this.logger.error(`Failed to refund QRIS payment: ${qrCodeId}`);
      return false;
    }

    this.logger.log(`QRIS payment refunded: ${response.id} (${qrCodeId})`);
    return true;
  }
}
