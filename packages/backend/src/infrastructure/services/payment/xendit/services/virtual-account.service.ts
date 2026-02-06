/**
 * Xendit Virtual Account Service
 *
 * Handles Virtual Account payments for Indonesian banks:
 * - BCA, BNI, BRI, Mandiri, Permata
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type {
  XenditVARequest,
  XenditVAResponse,
  XenditConfig,
  XenditRefundRequest,
  XenditRefundResponse,
} from '../types';
import { XENDIT_ENDPOINTS } from '../types';

export class XenditVirtualAccountService extends XenditBaseService {
  private readonly supportedBanks = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'] as const;

  constructor(config: XenditConfig) {
    super(config, 'XenditVirtualAccountService');
  }

  /**
   * Create a Virtual Account payment
   */
  async createPayment(
    input: PaymentInput,
    externalId: string,
    bankCode: string,
  ): Promise<PaymentResult> {
    if (!this.isSupportedBank(bankCode)) {
      return {
        success: false,
        transactionRef: '',
        message: `Unsupported bank: ${bankCode}. Supported banks: ${this.supportedBanks.join(', ')}`,
      };
    }

    const payload: XenditVARequest = {
      external_id: externalId,
      bank_code: bankCode as XenditVARequest['bank_code'],
      name: input.customer?.name || 'Customer',
      is_single_use: true,
      is_closed: true,
      expected_amount: input.amount,
      description: input.description || 'Payment',
      currency: 'IDR',
    };

    const response = await this.post<XenditVAResponse>(this.buildUrl(XENDIT_ENDPOINTS.va), payload);

    if (!response) {
      return {
        success: false,
        transactionRef: '',
        message: 'Failed to create Virtual Account',
      };
    }

    this.logger.log(`Virtual Account created: ${response.id} (${bankCode})`);

    return {
      success: true,
      transactionRef: response.id,
      paymentData: {
        bankCode: response.bank_code,
        accountNumber: response.account_number,
        merchantCode: response.merchant_code,
        amount: response.amount,
        expiresAt: response.expiration_date,
        type: 'VA',
      },
      message: `Transfer to ${response.account_number} (${bankCode})`,
    };
  }

  /**
   * Get Virtual Account status
   */
  async getStatus(paymentCodeId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditVAResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.va}/${paymentCodeId}`),
    );

    if (!response) {
      return 'pending';
    }

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      ACTIVE: 'pending',
      INACTIVE: 'failed',
      PENDING: 'pending',
    };

    return statusMap[response.status] || 'pending';
  }

  /**
   * Refund a Virtual Account payment
   */
  async refund(paymentCodeId: string, amount: number, reason?: string): Promise<boolean> {
    const payload: XenditRefundRequest = { amount, reason };

    const response = await this.post<XenditRefundResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.va}/${paymentCodeId}/refunds`),
      payload,
    );

    if (!response) {
      this.logger.error(`Failed to refund VA payment: ${paymentCodeId}`);
      return false;
    }

    this.logger.log(`VA payment refunded: ${response.id} (${paymentCodeId})`);
    return true;
  }

  /**
   * Check if bank code is supported
   */
  private isSupportedBank(bankCode: string): boolean {
    const upperCode = bankCode.toUpperCase();
    return this.supportedBanks.some((bank) => bank === upperCode);
  }
}
