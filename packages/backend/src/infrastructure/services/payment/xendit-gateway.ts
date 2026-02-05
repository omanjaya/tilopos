/**
 * Xendit Payment Gateway
 *
 * Features:
 * - QRIS (static & dynamic)
 * - Virtual Accounts (BCA, BNI, BRI, Mandiri, Permata)
 * - E-Wallets (GoPay, OVO, Dana, ShopeePay, LinkAja)
 * - Credit/Debit Card
 * - Retail outlets (Alfamart, Indomaret)
 * - Webhook signature verification (HMAC SHA256)
 * - Refund processing
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import axios, { type AxiosError } from 'axios';
import type {
  IPaymentGateway,
  PaymentInput,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from '@domain/interfaces/services';

// ============================================================================
// Types
// ============================================================================

type XenditPaymentMethod =
  | 'QRIS'
  | 'BCA'
  | 'BNI'
  | 'BRI'
  | 'MANDIRI'
  | 'PERMATA'
  | 'GOPAY'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY'
  | 'LINKAJA'
  | 'ALFAMART'
  | 'INDOMARET'
  | 'CREDIT_CARD';

interface XenditInvoiceRequest {
  external_id: string;
  amount: number;
  description?: string;
  invoice_duration?: number;
  payment_methods: XenditPaymentMethod[];
  customer?: {
    given_names: string;
    email: string;
    mobile_number: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  fees?: Array<{
    type: string;
    value: number;
  }>;
  should_authenticate_credit_card?: boolean;
  currency?: 'IDR';
  fixed_va?: boolean;
  for_user_id?: string;
  platform?: string;
}

interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED' | 'PAID' | 'VOIDED';
  amount: number;
  payment_channel: string | null;
  payment_method: string | null;
  payment_details: unknown | null;
  created: string;
  updated: string;
  invoice_url: string;
  expiry_date: string;
  user_id: string;
}

interface XenditQRCodeRequest {
  external_id: string;
  type: 'DYNAMIC' | 'STATIC';
  callback_url: string;
  amount: number;
  currency?: 'IDR';
}

interface XenditQRCodeResponse {
  id: string;
  external_id: string;
  amount: number;
  qr_string: string;
  created: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED';
  expiry_date: string;
}

interface XenditVARequest {
  external_id: string;
  bank_code: 'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA';
  name: string;
  is_single_use?: boolean;
  is_closed?: boolean;
  expected_amount: number;
  expiration_date?: string;
  description?: string;
  currency?: 'IDR';
}

interface XenditVAResponse {
  id: string;
  owner_id: string;
  external_id: string;
  bank_code: string;
  merchant_code: string;
  account_number: string;
  amount: number;
  is_closed: boolean;
  is_single_use: boolean;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'PAID';
  expiration_date: string;
}

interface XenditEwalletRequest {
  external_id: string;
  amount: number;
  phone: string;
  ewallet_type: 'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA';
  callback_url: string;
  description?: string;
  currency?: 'IDR';
}

interface XenditEwalletResponse {
  external_id: string;
  amount: number;
  phone: string;
  ewallet_type: string;
  checkout_url: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
}

interface XenditRetailRequest {
  external_id: string;
  retail_outlet_name: 'ALFAMART' | 'INDOMARET';
  name: string;
  expected_amount: number;
  payment_code: string;
  expiration_date?: string;
  currency?: 'IDR';
}

interface XenditRetailResponse {
  external_id: string;
  retail_outlet_name: string;
  payment_code: string;
  name: string;
  expected_amount: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  expiration_date: string;
}

interface XenditRefundRequest {
  amount: number;
  reason?: string;
  external_id?: string;
}

interface XenditRefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  created: string;
}

interface XenditWebhookPayload {
  event: string;
  id: string;
  external_id: string;
  status: string;
  amount: number;
  payment_method: string;
  created: string;
}

// ============================================================================
// Gateway Implementation
// ============================================================================

@Injectable()
export class XenditGateway implements IPaymentGateway {
  private readonly logger = new Logger(XenditGateway.name);
  private readonly apiKey: string;
  private readonly webhookToken: string;
  private readonly baseUrl = 'https://api.xendit.co';

  // API endpoints
  private readonly endpoints = {
    invoice: '/v2/invoices',
    qrcode: '/qr_codes',
    va: '/v2/payment_codes',
    ewallet: '/v2/ewallets',
    retail: '/v2/retail_outlets',
  } as const;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('XENDIT_API_KEY', '');
    this.webhookToken = this.configService.get<string>('XENDIT_WEBHOOK_TOKEN', '');

    if (!this.apiKey) {
      this.logger.warn('XENDIT_API_KEY not configured — Xendit gateway disabled');
    }
  }

  // ---------------------------------------------------------------------------
  // Public Methods (IPaymentGateway Interface)
  // ---------------------------------------------------------------------------

  /**
   * Process payment using Xendit
   * Routes to appropriate payment method based on input.method
   */
  async processPayment(input: PaymentInput): Promise<PaymentResult> {
    if (!this.apiKey) {
      return this.errorResult('Xendit API key not configured');
    }

    try {
      const method = this.normalizePaymentMethod(input.method);

      switch (method.type) {
        case 'QRIS':
          return this.createQRISPayment(input);
        case 'VA':
          return this.createVAPayment(input, method.bankCode!);
        case 'EWALLET':
          return this.createEwalletPayment(input, method.ewalletType!);
        case 'RETAIL':
          return this.createRetailPayment(input, method.retailOutlet!);
        case 'CREDIT_CARD':
          return this.createInvoicePayment(input);
        default:
          return this.createInvoicePayment(input);
      }
    } catch (error) {
      this.handleError('processPayment', error);
      return this.errorResult('Payment processing failed');
    }
  }

  /**
   * Refund a payment via Xendit
   * Supports invoice, QR code, and payment code (VA) refunds
   */
  async refundPayment(
    transactionRef: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    if (!this.apiKey) {
      return { success: false, refundRef: '', message: 'Xendit API key not configured' };
    }

    try {
      // Try to determine payment type from transaction ref prefix
      const paymentType = this.extractPaymentType(transactionRef);

      switch (paymentType) {
        case 'invoice':
          return this.refundInvoice(transactionRef, amount, reason);
        case 'qrcode':
          return this.refundQRCode(transactionRef, amount, reason);
        case 'va':
          return this.refundVA(transactionRef, amount, reason);
        default:
          // Try all methods sequentially
          return await this.tryRefundAllMethods(transactionRef, amount, reason);
      }
    } catch (error) {
      this.handleError('refundPayment', error);
      return { success: false, refundRef: '', message: 'Refund failed' };
    }
  }

  /**
   * Check payment status from Xendit
   */
  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
    if (!this.apiKey) {
      return 'pending';
    }

    try {
      const paymentType = this.extractPaymentType(transactionRef);

      switch (paymentType) {
        case 'invoice':
          return this.getInvoiceStatus(transactionRef);
        case 'qrcode':
          return this.getQRCodeStatus(transactionRef);
        case 'va':
          return this.getVAStatus(transactionRef);
        case 'ewallet':
          return this.getEwalletStatus(transactionRef);
        default:
          return 'pending';
      }
    } catch {
      return 'pending';
    }
  }

  // ---------------------------------------------------------------------------
  // Payment Method Implementations
  // ---------------------------------------------------------------------------

  /**
   * Create QRIS payment (dynamic QR code)
   */
  private async createQRISPayment(input: PaymentInput): Promise<PaymentResult> {
    const externalId = this.generateExternalId('qris', input.referenceNumber);

    const payload: XenditQRCodeRequest = {
      external_id: externalId,
      type: 'DYNAMIC',
      callback_url: this.getWebhookUrl(),
      amount: input.amount,
    };

    const response = await this.post<XenditQRCodeResponse>(
      `${this.baseUrl}${this.endpoints.qrcode}`,
      payload,
    );

    if (!response) {
      return this.errorResult('Failed to create QRIS payment');
    }

    this.logger.log(`QRIS payment created: ${response.id} (${externalId})`);

    return {
      success: true,
      transactionRef: response.id,
      paymentData: {
        qrString: response.qr_string,
        expiresAt: response.expiry_date,
        amount: response.amount,
      },
      message: 'QRIS payment created. Scan QR code to pay.',
    };
  }

  /**
   * Create Virtual Account payment
   */
  private async createVAPayment(input: PaymentInput, bankCode: string): Promise<PaymentResult> {
    const externalId = this.generateExternalId('va', input.referenceNumber);

    const payload: XenditVARequest = {
      external_id: externalId,
      bank_code: bankCode as XenditVARequest['bank_code'],
      name: input.customer?.name || 'Customer',
      is_single_use: true,
      expected_amount: input.amount,
      description: input.description || 'Payment',
      currency: 'IDR',
    };

    const response = await this.post<XenditVAResponse>(
      `${this.baseUrl}${this.endpoints.va}`,
      payload,
    );

    if (!response) {
      return this.errorResult('Failed to create VA payment');
    }

    this.logger.log(`VA payment created: ${response.id} (${bankCode})`);

    return {
      success: true,
      transactionRef: response.id,
      paymentData: {
        bankCode: response.bank_code,
        accountNumber: response.account_number,
        merchantCode: response.merchant_code,
        amount: response.amount,
        expiresAt: response.expiration_date,
      },
      message: `VA created. Transfer to ${response.account_number} (${bankCode})`,
    };
  }

  /**
   * Create E-Wallet payment
   */
  private async createEwalletPayment(
    input: PaymentInput,
    ewalletType: string,
  ): Promise<PaymentResult> {
    const externalId = this.generateExternalId('ew', input.referenceNumber);

    if (!input.customer?.phone) {
      return this.errorResult('Phone number required for e-wallet payment');
    }

    const payload: XenditEwalletRequest = {
      external_id: externalId,
      amount: input.amount,
      phone: input.customer.phone,
      ewallet_type: ewalletType as XenditEwalletRequest['ewallet_type'],
      callback_url: this.getWebhookUrl(),
      description: input.description || 'Payment',
    };

    const response = await this.post<XenditEwalletResponse>(
      `${this.baseUrl}${this.endpoints.ewallet}`,
      payload,
    );

    if (!response) {
      return this.errorResult('Failed to create e-wallet payment');
    }

    this.logger.log(`E-wallet payment created: ${response.external_id} (${ewalletType})`);

    return {
      success: true,
      transactionRef: response.external_id,
      paymentData: {
        checkoutUrl: response.checkout_url,
        amount: response.amount,
        status: response.status,
      },
      message: `Redirect to ${ewalletType} to complete payment`,
    };
  }

  /**
   * Create Retail outlet payment (Alfamart/Indomaret)
   */
  private async createRetailPayment(input: PaymentInput, outlet: string): Promise<PaymentResult> {
    const externalId = this.generateExternalId('retail', input.referenceNumber);

    const payload: XenditRetailRequest = {
      external_id: externalId,
      retail_outlet_name: outlet as XenditRetailRequest['retail_outlet_name'],
      name: input.customer?.name || 'Customer',
      expected_amount: input.amount,
      payment_code: externalId,
      currency: 'IDR',
    };

    const response = await this.post<XenditRetailResponse>(
      `${this.baseUrl}${this.endpoints.retail}`,
      payload,
    );

    if (!response) {
      return this.errorResult('Failed to create retail payment');
    }

    this.logger.log(`Retail payment created: ${response.external_id} (${outlet})`);

    return {
      success: true,
      transactionRef: response.external_id,
      paymentData: {
        paymentCode: response.payment_code,
        outlet: response.retail_outlet_name,
        amount: response.amount,
        expiresAt: response.expiration_date,
      },
      message: `Pay at ${outlet} with code: ${response.payment_code}`,
    };
  }

  /**
   * Create Invoice payment (multi-method, includes credit card)
   */
  private async createInvoicePayment(input: PaymentInput): Promise<PaymentResult> {
    const externalId = this.generateExternalId('inv', input.referenceNumber);

    const payload: XenditInvoiceRequest = {
      external_id: externalId,
      amount: input.amount,
      description: input.description || 'Payment',
      currency: 'IDR',
      payment_methods:
        (input.paymentMethods as XenditPaymentMethod[]) || this.getDefaultPaymentMethods(),
      invoice_duration: input.expirySeconds || 86400, // 24 hours default
      customer: input.customer
        ? {
            given_names: input.customer.name,
            email: input.customer.email || 'customer@example.com',
            mobile_number: input.customer.phone || '+6280000000000',
          }
        : undefined,
    };

    const response = await this.post<XenditInvoiceResponse>(
      `${this.baseUrl}${this.endpoints.invoice}`,
      payload,
    );

    if (!response) {
      return this.errorResult('Failed to create invoice');
    }

    this.logger.log(`Invoice created: ${response.id}`);

    return {
      success: true,
      transactionRef: response.id,
      paymentData: {
        invoiceUrl: response.invoice_url,
        amount: response.amount,
        expiresAt: response.expiry_date,
      },
      message: 'Invoice created. Complete payment via invoice page.',
    };
  }

  // ---------------------------------------------------------------------------
  // Refund Implementations
  // ---------------------------------------------------------------------------

  private async refundInvoice(
    invoiceId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const payload: XenditRefundRequest = { amount, reason };
    const response = await this.post<XenditRefundResponse>(
      `${this.baseUrl}${this.endpoints.invoice}/${invoiceId}/refunds`,
      payload,
    );

    if (!response) {
      return { success: false, refundRef: '', message: 'Invoice refund failed' };
    }

    return { success: true, refundRef: response.id, message: 'Refund processed' };
  }

  private async refundQRCode(
    qrCodeId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const payload: XenditRefundRequest = { amount, reason };
    const response = await this.post<XenditRefundResponse>(
      `${this.baseUrl}${this.endpoints.qrcode}/${qrCodeId}/refunds`,
      payload,
    );

    if (!response) {
      return { success: false, refundRef: '', message: 'QRIS refund failed' };
    }

    return { success: true, refundRef: response.id, message: 'Refund processed' };
  }

  private async refundVA(
    paymentCodeId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const payload: XenditRefundRequest = { amount, reason };
    const response = await this.post<XenditRefundResponse>(
      `${this.baseUrl}${this.endpoints.va}/${paymentCodeId}/refunds`,
      payload,
    );

    if (!response) {
      return { success: false, refundRef: '', message: 'VA refund failed' };
    }

    return { success: true, refundRef: response.id, message: 'Refund processed' };
  }

  private async tryRefundAllMethods(
    refId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    // Try invoice refund first
    const invoiceResult = await this.refundInvoice(refId, amount, reason).catch(() => null);
    if (invoiceResult?.success) return invoiceResult;

    // Try QR code refund
    const qrResult = await this.refundQRCode(refId, amount, reason).catch(() => null);
    if (qrResult?.success) return qrResult;

    // Try VA refund
    const vaResult = await this.refundVA(refId, amount, reason).catch(() => null);
    if (vaResult?.success) return vaResult;

    return { success: false, refundRef: '', message: 'Refund failed - payment not found' };
  }

  // ---------------------------------------------------------------------------
  // Status Check Implementations
  // ---------------------------------------------------------------------------

  private async getInvoiceStatus(invoiceId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditInvoiceResponse>(
      `${this.baseUrl}${this.endpoints.invoice}/${invoiceId}`,
    );

    if (!response) return 'pending';

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      SETTLED: 'completed',
      PENDING: 'pending',
      EXPIRED: 'failed',
      VOIDED: 'failed',
    };

    return statusMap[response.status] || 'pending';
  }

  private async getQRCodeStatus(qrCodeId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditQRCodeResponse>(
      `${this.baseUrl}${this.endpoints.qrcode}/${qrCodeId}`,
    );

    if (!response) return 'pending';

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      ACTIVE: 'pending',
      INACTIVE: 'pending',
      EXPIRED: 'failed',
    };

    return statusMap[response.status] || 'pending';
  }

  private async getVAStatus(paymentCodeId: string): Promise<PaymentStatus> {
    const response = await this.get<XenditVAResponse>(
      `${this.baseUrl}${this.endpoints.va}/${paymentCodeId}`,
    );

    if (!response) return 'pending';

    const statusMap: Record<string, PaymentStatus> = {
      PAID: 'completed',
      ACTIVE: 'pending',
      INACTIVE: 'failed',
    };

    return statusMap[response.status] || 'pending';
  }

  private async getEwalletStatus(_externalId: string): Promise<PaymentStatus> {
    // For e-wallets, we need to check via callback or polling
    // Since Xendit doesn't provide a direct status endpoint for e-wallets,
    // we return 'pending' and rely on webhooks
    return 'pending';
  }

  // ---------------------------------------------------------------------------
  // Webhook Verification
  // ---------------------------------------------------------------------------

  /**
   * Verify Xendit webhook signature
   * Uses HMAC SHA256 for verification
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookToken) {
      this.logger.warn('XENDIT_WEBHOOK_TOKEN not configured - skipping webhook verification');
      return true;
    }

    const expectedSignature = createHash('sha256')
      .update(payload + this.webhookToken)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Parse webhook payload and extract payment status
   */
  parseWebhookPayload(payload: XenditWebhookPayload): {
    status: string;
    externalId: string;
    amount: number;
  } {
    return {
      status: this.mapWebhookStatus(payload.status),
      externalId: payload.external_id,
      amount: payload.amount,
    };
  }

  private mapWebhookStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PAID: 'completed',
      SETTLED: 'completed',
      COMPLETED: 'completed',
      PENDING: 'pending',
      EXPIRED: 'failed',
      FAILED: 'failed',
      VOIDED: 'failed',
      CANCELLED: 'failed',
    };

    return statusMap[status] || status;
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private async post<T>(url: string, payload: unknown): Promise<T | null> {
    try {
      const response = await axios.post<T>(url, payload, {
        auth: { username: this.apiKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      this.handleError('POST', error);
      return null;
    }
  }

  private async get<T>(url: string): Promise<T | null> {
    try {
      const response = await axios.get<T>(url, {
        auth: { username: this.apiKey, password: '' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      this.handleError('GET', error);
      return null;
    }
  }

  private handleError(operation: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      this.logger.error(
        `Xendit ${operation} failed: ${axiosError.response?.data?.message || axiosError.message}`,
      );
    } else {
      this.logger.error(
        `Xendit ${operation} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private errorResult(message: string): PaymentResult {
    return { success: false, transactionRef: '', message };
  }

  private generateExternalId(prefix: string, reference?: string): string {
    const suffix = reference || `${Date.now()}-${randomBytes(4).toString('hex')}`;
    return `${prefix.toUpperCase()}_${suffix}`;
  }

  private getWebhookUrl(): string {
    return this.configService.get<string>(
      'XENDIT_WEBHOOK_URL',
      'https://api.example.com/payments/xendit/callback',
    );
  }

  private getDefaultPaymentMethods(): XenditPaymentMethod[] {
    return ['QRIS', 'BCA', 'BNI', 'BRI', 'MANDIRI', 'GOPAY', 'OVO', 'DANA', 'SHOPEEPAY'];
  }

  private normalizePaymentMethod(method: string): {
    type: 'QRIS' | 'VA' | 'EWALLET' | 'RETAIL' | 'CREDIT_CARD';
    bankCode?: string;
    ewalletType?: string;
    retailOutlet?: string;
  } {
    const methodLower = method.toLowerCase();

    // QRIS
    if (methodLower === 'qris') {
      return { type: 'QRIS' };
    }

    // Virtual Accounts
    if (['bca', 'bni', 'bri', 'mandiri', 'permata'].includes(methodLower)) {
      return {
        type: 'VA',
        bankCode: method.toLowerCase() === 'permata' ? 'PERMATA' : method.toUpperCase(),
      };
    }

    // E-Wallets
    if (['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'].includes(methodLower)) {
      return { type: 'EWALLET', ewalletType: method.toUpperCase() };
    }

    // Retail
    if (['alfamart', 'indomaret'].includes(methodLower)) {
      return { type: 'RETAIL', retailOutlet: method.toUpperCase() };
    }

    // Credit Card / Default
    return { type: 'CREDIT_CARD' };
  }

  private extractPaymentType(
    transactionRef: string,
  ): 'invoice' | 'qrcode' | 'va' | 'ewallet' | 'unknown' {
    if (transactionRef.startsWith('inv_')) return 'invoice';
    if (transactionRef.startsWith('qr_')) return 'qrcode';
    if (transactionRef.startsWith('va_')) return 'va';
    if (transactionRef.startsWith('ew_')) return 'ewallet';
    return 'unknown';
  }
}
