/**
 * Xendit Invoice Service
 *
 * Handles invoice-based payments which support multiple payment methods:
 * - Credit/Debit Cards
 * - Multiple payment methods in one invoice
 * - Custom invoice pages
 */

import type { PaymentInput, PaymentResult, PaymentStatus } from '@domain/interfaces/services';
import { XenditBaseService } from './base.service';
import type {
  XenditInvoiceRequest,
  XenditInvoiceResponse,
  XenditPaymentMethod,
  XenditConfig,
  XenditRefundRequest,
  XenditRefundResponse,
} from '../types';
import { XENDIT_ENDPOINTS } from '../types';

export class XenditInvoiceService extends XenditBaseService {
  constructor(config: XenditConfig) {
    super(config, 'XenditInvoiceService');
  }

  /**
   * Create an invoice payment
   * Supports multiple payment methods including credit cards
   */
  async createPayment(input: PaymentInput, externalId: string): Promise<PaymentResult> {
    const payload: XenditInvoiceRequest = {
      external_id: externalId,
      amount: input.amount,
      description: input.description || 'Payment',
      currency: 'IDR',
      payment_methods: this.getPaymentMethods(input),
      invoice_duration: input.expirySeconds || 86400, // 24 hours default
      should_authenticate_credit_card: true,
    };

    // Add customer information if provided
    if (input.customer) {
      payload.customer = {
        given_names: input.customer.name,
        email: input.customer.email || 'customer@example.com',
        mobile_number: input.customer.phone || '+6280000000000',
      };
    }

    const response = await this.post<XenditInvoiceResponse>(
      this.buildUrl(XENDIT_ENDPOINTS.invoice),
      payload,
    );

    if (!response) {
      return {
        success: false,
        transactionRef: '',
        message: 'Failed to create invoice',
      };
    }

    this.logger.log(`Invoice created: ${response.id} (${externalId})`);

    return {
      success: true,
      transactionRef: response.id,
      paymentData: {
        invoiceUrl: response.invoice_url,
        amount: response.amount,
        expiresAt: response.expiry_date,
        paymentMethods: payload.payment_methods,
        type: 'INVOICE',
      },
      message: 'Invoice created. Complete payment via invoice page.',
    };
  }

  /**
   * Get invoice status
   */
  async getStatus(invoiceId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditInvoiceResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.invoice}/${invoiceId}`),
    );

    if (!response) {
      return 'pending';
    }

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      SETTLED: 'completed',
      PENDING: 'pending',
      EXPIRED: 'failed',
      VOIDED: 'failed',
    };

    return statusMap[response.status] || 'pending';
  }

  /**
   * Refund an invoice payment
   */
  async refund(invoiceId: string, amount: number, reason?: string): Promise<boolean> {
    const payload: XenditRefundRequest = { amount, reason };

    const response = await this.post<XenditRefundResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.invoice}/${invoiceId}/refunds`),
      payload,
    );

    if (!response) {
      this.logger.error(`Failed to refund invoice: ${invoiceId}`);
      return false;
    }

    this.logger.log(`Invoice refunded: ${response.id} (${invoiceId})`);
    return true;
  }

  /**
   * Get invoice details
   */
  async getInvoiceDetails(invoiceId: string): Promise<XenditInvoiceResponse | null> {
    return this.get<XenditInvoiceResponse>(
      this.buildUrl(`${XENDIT_ENDPOINTS.invoice}/${invoiceId}`),
    );
  }

  /**
   * Determine payment methods for invoice
   */
  private getPaymentMethods(input: PaymentInput): XenditPaymentMethod[] {
    // If specific payment methods are provided, use them
    if (input.paymentMethods && input.paymentMethods.length > 0) {
      return input.paymentMethods as XenditPaymentMethod[];
    }

    // Default payment methods
    return this.getDefaultPaymentMethods();
  }

  /**
   * Get default payment methods for invoices
   */
  private getDefaultPaymentMethods(): XenditPaymentMethod[] {
    return [
      'QRIS',
      'BCA',
      'BNI',
      'BRI',
      'MANDIRI',
      'GOPAY',
      'OVO',
      'DANA',
      'SHOPEEPAY',
      'CREDIT_CARD',
    ];
  }
}
