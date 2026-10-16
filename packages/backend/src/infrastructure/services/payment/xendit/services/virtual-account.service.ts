/**
 * Xendit Virtual Account Service (BCA, BNI, BRI, Mandiri, Permata).
 *
 * NOTE: POST /callback_virtual_accounts per the public API reference; not
 * verified against a sandbox in this codebase.
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type { XenditVARequest, XenditVAResponse, XenditConfig } from '../types';
import { XENDIT_ENDPOINTS, formatXenditRef } from '../types';

export class XenditVirtualAccountService extends XenditBaseService {
  private readonly supportedBanks = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'] as const;

  constructor(config: XenditConfig) {
    super(config, 'XenditVirtualAccountService');
  }

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
        paymentData: { paymentStatus: 'failed' },
      };
    }

    const payload: XenditVARequest = {
      external_id: externalId,
      bank_code: bankCode.toUpperCase() as XenditVARequest['bank_code'],
      name: input.customer?.name || 'Customer',
      is_single_use: true,
      is_closed: true,
      expected_amount: input.amount,
      description: input.description || 'Payment',
      currency: 'IDR',
    };

    const response = await this.post<XenditVAResponse>(this.buildUrl(XENDIT_ENDPOINTS.va), payload);

    this.logger.log(`Virtual Account created: ${response.id} (${bankCode})`);

    return {
      success: true,
      transactionRef: formatXenditRef('va', response.id),
      paymentData: {
        paymentStatus: 'pending',
        bankCode: response.bank_code,
        accountNumber: response.account_number,
        merchantCode: response.merchant_code,
        amount: response.expected_amount ?? input.amount,
        expiresAt: response.expiration_date,
        type: 'VA',
      },
      message: `Transfer to ${response.account_number} (${bankCode})`,
    };
  }

  /**
   * A single-use closed VA turns INACTIVE both when paid and when expired, so
   * the VA object alone cannot confirm a payment: the paid state is delivered by
   * the VA payment callback. The lookup still runs so API/auth errors surface.
   */
  async getStatus(vaId: string): Promise<PaymentStatus> {
    await this.get<XenditVAResponse>(this.buildUrl(`${XENDIT_ENDPOINTS.va}/${vaId}`));
    return 'pending';
  }

  private isSupportedBank(bankCode: string): boolean {
    const upperCode = bankCode.toUpperCase();
    return this.supportedBanks.some((bank) => bank === upperCode);
  }
}
