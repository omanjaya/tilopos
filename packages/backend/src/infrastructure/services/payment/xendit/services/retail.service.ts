/**
 * Xendit Retail Outlet Service (Alfamart, Indomaret).
 *
 * NOTE: uses the Fixed Payment Code API (POST/GET /fixed_payment_code) per the
 * public API reference; not verified against a sandbox in this codebase.
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type { XenditRetailRequest, XenditRetailResponse, XenditConfig } from '../types';
import { XENDIT_ENDPOINTS, formatXenditRef } from '../types';

export class XenditRetailService extends XenditBaseService {
  private readonly supportedOutlets = ['ALFAMART', 'INDOMARET'] as const;

  constructor(config: XenditConfig) {
    super(config, 'XenditRetailService');
  }

  async createPayment(
    input: PaymentInput,
    externalId: string,
    retailOutlet: string,
  ): Promise<PaymentResult> {
    if (!this.isSupportedOutlet(retailOutlet)) {
      return {
        success: false,
        transactionRef: '',
        message: `Unsupported retail outlet: ${retailOutlet}. Supported: ${this.supportedOutlets.join(', ')}`,
        paymentData: { paymentStatus: 'failed' },
      };
    }

    const payload: XenditRetailRequest = {
      external_id: externalId,
      retail_outlet_name: retailOutlet.toUpperCase() as XenditRetailRequest['retail_outlet_name'],
      name: input.customer?.name || 'Customer',
      expected_amount: input.amount,
      is_single_use: true,
    };
    if (input.expirySeconds) {
      payload.expiration_date = new Date(Date.now() + input.expirySeconds * 1000).toISOString();
    }

    const response = await this.post<XenditRetailResponse>(
      this.buildUrl(XENDIT_ENDPOINTS.retail),
      payload,
    );

    this.logger.log(`Retail payment code created: ${response.id} (${retailOutlet})`);

    return {
      success: true,
      transactionRef: formatXenditRef('retail', response.id),
      paymentData: {
        paymentStatus: 'pending',
        paymentCode: response.payment_code,
        outlet: response.retail_outlet_name,
        amount: response.expected_amount,
        expiresAt: response.expiration_date,
        type: 'RETAIL',
      },
      message: `Pay at ${retailOutlet} with code: ${response.payment_code}`,
    };
  }

  /**
   * A single-use payment code turns INACTIVE both when paid and when expired,
   * so the code object alone cannot confirm a payment; the paid state comes from
   * the retail payment callback. The lookup still runs so API/auth errors surface.
   */
  async getStatus(paymentCodeId: string): Promise<PaymentStatus> {
    await this.get<XenditRetailResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.retail}/${paymentCodeId}`),
    );
    return 'pending';
  }

  private isSupportedOutlet(outlet: string): boolean {
    const upperOutlet = outlet.toUpperCase();
    return this.supportedOutlets.some((o) => o === upperOutlet);
  }
}
