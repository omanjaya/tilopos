/**
 * Xendit utilities: external id generation, payment method normalization and
 * amount limits.
 */

import { randomUUID } from 'crypto';
import type { NormalizedPaymentMethod, PaymentMethodType } from '../types';

export class XenditUtilsService {
  /**
   * The external/reference id sent to Xendit is our own reference (the Payment
   * or Invoice id) unchanged, so callbacks map 1:1 to the stored record.
   */
  static generateExternalId(reference?: string): string {
    return reference && reference.trim() ? reference : randomUUID();
  }

  /**
   * Maps a payment method to a Xendit product. Returns null for methods Xendit
   * cannot collect (cash, credit notes, unknown values) instead of silently
   * falling back to an invoice.
   */
  static normalizePaymentMethod(method: string): NormalizedPaymentMethod | null {
    const m = method.toLowerCase().trim();

    if (m === 'qris') return { type: 'QRIS' };

    const vaBanks = ['bca', 'bni', 'bri', 'mandiri', 'permata'];
    if (vaBanks.includes(m)) return { type: 'VA', bankCode: m.toUpperCase() };

    const ewallets = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];
    if (ewallets.includes(m)) return { type: 'EWALLET', ewalletType: m.toUpperCase() };

    const retailers = ['alfamart', 'indomaret'];
    if (retailers.includes(m)) return { type: 'RETAIL', retailOutlet: m.toUpperCase() };

    if (['card', 'credit_card', 'creditcard', 'debit_card'].includes(m)) {
      return { type: 'CREDIT_CARD' };
    }

    // Hosted invoice page: the payer picks a VA bank / channel there.
    if (m === 'invoice' || m === 'bank_transfer') return { type: 'INVOICE' };

    return null;
  }

  /** Xendit minimum / maximum amounts (IDR). */
  static validateAmount(
    amount: number,
    method: PaymentMethodType,
  ): { valid: boolean; message?: string } {
    if (!(amount > 0)) {
      return { valid: false, message: 'Amount must be greater than 0' };
    }

    const minimumAmounts: Record<PaymentMethodType, number> = {
      QRIS: 1500,
      VA: 10000,
      EWALLET: 1000,
      RETAIL: 10000,
      CREDIT_CARD: 10000,
      INVOICE: 10000,
    };
    const minimum = minimumAmounts[method];
    if (amount < minimum) {
      return {
        valid: false,
        message: `Minimum amount for ${method} is IDR ${minimum.toLocaleString()}`,
      };
    }

    const maximum = 100000000;
    if (amount > maximum) {
      return { valid: false, message: `Maximum amount is IDR ${maximum.toLocaleString()}` };
    }

    return { valid: true };
  }
}
