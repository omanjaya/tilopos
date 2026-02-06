/**
 * Xendit E-Wallet Service
 *
 * Handles E-Wallet payments for Indonesian digital wallets:
 * - GoPay, OVO, Dana, ShopeePay, LinkAja
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type { XenditEwalletRequest, XenditEwalletResponse, XenditConfig } from '../types';
import { XENDIT_ENDPOINTS } from '../types';

export class XenditEwalletService extends XenditBaseService {
  private readonly supportedWallets = ['GOPAY', 'OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'] as const;

  constructor(config: XenditConfig) {
    super(config, 'XenditEwalletService');
  }

  /**
   * Create an E-Wallet payment
   */
  async createPayment(
    input: PaymentInput,
    externalId: string,
    ewalletType: string,
  ): Promise<PaymentResult> {
    if (!this.isSupportedWallet(ewalletType)) {
      return {
        success: false,
        transactionRef: '',
        message: `Unsupported e-wallet: ${ewalletType}. Supported: ${this.supportedWallets.join(', ')}`,
      };
    }

    if (!input.customer?.phone) {
      return {
        success: false,
        transactionRef: '',
        message: 'Phone number is required for e-wallet payments',
      };
    }

    const payload: XenditEwalletRequest = {
      external_id: externalId,
      amount: input.amount,
      phone: this.normalizePhoneNumber(input.customer.phone),
      ewallet_type: ewalletType as XenditEwalletRequest['ewallet_type'],
      callback_url: this.config.webhookUrl,
      description: input.description || 'Payment',
      currency: 'IDR',
    };

    const response = await this.post<XenditEwalletResponse>(
      this.buildUrl(XENDIT_ENDPOINTS.ewallet),
      payload,
    );

    if (!response) {
      return {
        success: false,
        transactionRef: '',
        message: 'Failed to create e-wallet payment',
      };
    }

    this.logger.log(`E-wallet payment created: ${response.external_id} (${ewalletType})`);

    return {
      success: true,
      transactionRef: response.external_id,
      paymentData: {
        checkoutUrl: response.checkout_url,
        amount: response.amount,
        status: response.status,
        ewalletType: response.ewallet_type,
        type: 'EWALLET',
      },
      message: `Redirect to ${ewalletType} to complete payment`,
    };
  }

  /**
   * Get E-Wallet payment status
   *
   * Note: Xendit doesn't provide a direct status endpoint for e-wallets.
   * Status updates are received via webhooks.
   */
  async getStatus(_externalId: string): Promise<PaymentStatus> {
    // E-wallet status is typically received via webhook callbacks
    // Return pending and rely on webhook updates
    return 'pending';
  }

  /**
   * Check if e-wallet type is supported
   */
  private isSupportedWallet(ewalletType: string): boolean {
    const upperType = ewalletType.toUpperCase();
    return this.supportedWallets.some((wallet) => wallet === upperType);
  }

  /**
   * Normalize phone number to Indonesian format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    // Add +62 prefix if needed
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }

    if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }

    return '+' + normalized;
  }
}
