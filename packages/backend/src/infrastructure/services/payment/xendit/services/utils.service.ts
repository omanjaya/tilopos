/**
 * Xendit Utilities Service
 *
 * Provides utility functions for Xendit payment processing:
 * - External ID generation
 * - Payment method normalization
 * - URL building
 */

import { randomBytes } from 'crypto';
import type { NormalizedPaymentMethod, PaymentMethodType } from '../types';

export class XenditUtilsService {
  /**
   * Generate external ID with prefix and reference
   */
  static generateExternalId(prefix: string, reference?: string): string {
    const suffix = reference || `${Date.now()}-${randomBytes(4).toString('hex')}`;
    return `${prefix.toUpperCase()}_${suffix}`;
  }

  /**
   * Normalize payment method string to structured format
   */
  static normalizePaymentMethod(method: string): NormalizedPaymentMethod {
    const methodLower = method.toLowerCase().trim();

    // QRIS
    if (methodLower === 'qris') {
      return { type: 'QRIS' };
    }

    // Virtual Accounts
    const vaBanks = ['bca', 'bni', 'bri', 'mandiri', 'permata'];
    if (vaBanks.includes(methodLower)) {
      return {
        type: 'VA',
        bankCode: methodLower === 'permata' ? 'PERMATA' : method.toUpperCase(),
      };
    }

    // E-Wallets
    const ewallets = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];
    if (ewallets.includes(methodLower)) {
      return {
        type: 'EWALLET',
        ewalletType: method.toUpperCase(),
      };
    }

    // Retail Outlets
    const retailers = ['alfamart', 'indomaret'];
    if (retailers.includes(methodLower)) {
      return {
        type: 'RETAIL',
        retailOutlet: method.toUpperCase(),
      };
    }

    // Credit Card / Invoice (default)
    if (methodLower === 'credit_card' || methodLower === 'creditcard' || methodLower === 'card') {
      return { type: 'CREDIT_CARD' };
    }

    // Default to invoice for unknown methods
    return { type: 'CREDIT_CARD' };
  }

  /**
   * Get payment type prefix for external ID generation
   */
  static getPaymentPrefix(type: PaymentMethodType): string {
    const prefixMap: Record<PaymentMethodType, string> = {
      QRIS: 'qris',
      VA: 'va',
      EWALLET: 'ew',
      RETAIL: 'retail',
      CREDIT_CARD: 'inv',
    };

    return prefixMap[type] || 'pay';
  }

  /**
   * Validate amount (Xendit has minimum payment amounts)
   */
  static validateAmount(
    amount: number,
    method: PaymentMethodType,
  ): { valid: boolean; message?: string } {
    if (amount <= 0) {
      return { valid: false, message: 'Amount must be greater than 0' };
    }

    // Xendit minimum amounts (in IDR)
    const minimumAmounts: Record<PaymentMethodType, number> = {
      QRIS: 1500,
      VA: 10000,
      EWALLET: 1000,
      RETAIL: 10000,
      CREDIT_CARD: 10000,
    };

    const minimum = minimumAmounts[method] || 1000;

    if (amount < minimum) {
      return {
        valid: false,
        message: `Minimum amount for ${method} is IDR ${minimum.toLocaleString()}`,
      };
    }

    // Maximum amount check (100 million IDR)
    const maximum = 100000000;
    if (amount > maximum) {
      return {
        valid: false,
        message: `Maximum amount is IDR ${maximum.toLocaleString()}`,
      };
    }

    return { valid: true };
  }

  /**
   * Format Indonesian Rupiah amount
   */
  static formatIDR(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }

  /**
   * Parse payment method from transaction reference
   * Useful for determining payment type from Xendit IDs
   */
  static parsePaymentMethodFromRef(transactionRef: string): PaymentMethodType | null {
    const ref = transactionRef.toLowerCase();

    if (ref.startsWith('qr_') || ref.includes('qris')) {
      return 'QRIS';
    }

    if (ref.startsWith('va_') || ref.startsWith('pc_')) {
      return 'VA';
    }

    if (ref.startsWith('ew_') || ref.includes('ewallet')) {
      return 'EWALLET';
    }

    if (ref.includes('retail') || ref.includes('alfamart') || ref.includes('indomaret')) {
      return 'RETAIL';
    }

    if (ref.startsWith('inv_') || ref.match(/^[0-9a-f]{24}$/)) {
      return 'CREDIT_CARD';
    }

    return null;
  }

  /**
   * Calculate expiry date from seconds
   */
  static calculateExpiryDate(expirySeconds: number): string {
    const expiryDate = new Date(Date.now() + expirySeconds * 1000);
    return expiryDate.toISOString();
  }

  /**
   * Check if payment method supports refunds
   */
  static supportsRefund(method: PaymentMethodType): boolean {
    // E-wallets typically don't support API refunds
    return method !== 'EWALLET';
  }

  /**
   * Get human-readable payment method name
   */
  static getPaymentMethodName(method: string): string {
    const nameMap: Record<string, string> = {
      qris: 'QRIS',
      bca: 'BCA Virtual Account',
      bni: 'BNI Virtual Account',
      bri: 'BRI Virtual Account',
      mandiri: 'Mandiri Virtual Account',
      permata: 'Permata Virtual Account',
      gopay: 'GoPay',
      ovo: 'OVO',
      dana: 'DANA',
      shopeepay: 'ShopeePay',
      linkaja: 'LinkAja',
      alfamart: 'Alfamart',
      indomaret: 'Indomaret',
      credit_card: 'Credit/Debit Card',
    };

    return nameMap[method.toLowerCase()] || method;
  }
}
