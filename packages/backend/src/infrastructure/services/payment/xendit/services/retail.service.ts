/**
 * Xendit Retail Outlet Service
 *
 * Handles retail outlet payments for Indonesian retail chains:
 * - Alfamart
 * - Indomaret
 *
 * Customers receive a payment code to pay at physical retail locations
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type { XenditRetailRequest, XenditRetailResponse, XenditConfig } from '../types';
import { XENDIT_ENDPOINTS } from '../types';

export class XenditRetailService extends XenditBaseService {
  private readonly supportedOutlets = ['ALFAMART', 'INDOMARET'] as const;

  constructor(config: XenditConfig) {
    super(config, 'XenditRetailService');
  }

  /**
   * Create a retail outlet payment
   */
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
      };
    }

    const payload: XenditRetailRequest = {
      external_id: externalId,
      retail_outlet_name: retailOutlet as XenditRetailRequest['retail_outlet_name'],
      name: input.customer?.name || 'Customer',
      expected_amount: input.amount,
      payment_code: externalId,
      currency: 'IDR',
    };

    // Add expiration date if provided (default 24 hours)
    if (input.expirySeconds) {
      const expiryDate = new Date(Date.now() + input.expirySeconds * 1000);
      payload.expiration_date = expiryDate.toISOString();
    }

    const response = await this.post<XenditRetailResponse>(
      this.buildUrl(XENDIT_ENDPOINTS.retail),
      payload,
    );

    if (!response) {
      return {
        success: false,
        transactionRef: '',
        message: 'Failed to create retail outlet payment',
      };
    }

    this.logger.log(`Retail payment created: ${response.external_id} (${retailOutlet})`);

    return {
      success: true,
      transactionRef: response.external_id,
      paymentData: {
        paymentCode: response.payment_code,
        outlet: response.retail_outlet_name,
        amount: response.amount,
        expiresAt: response.expiration_date,
        type: 'RETAIL',
      },
      message: `Pay at ${retailOutlet} with code: ${response.payment_code}`,
    };
  }

  /**
   * Get retail payment status
   */
  async getStatus(externalId: string): Promise<PaymentStatus> {
    // Note: Xendit doesn't provide a direct status endpoint for retail outlets
    // Status updates are typically received via webhooks
    // This is a placeholder implementation
    this.logger.warn(`Status check for retail payment ${externalId} - rely on webhooks`);
    return 'pending';
  }

  /**
   * Check if retail outlet is supported
   */
  private isSupportedOutlet(outlet: string): boolean {
    const upperOutlet = outlet.toUpperCase();
    return this.supportedOutlets.some((o) => o === upperOutlet);
  }
}
