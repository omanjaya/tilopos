/**
 * Xendit Payment Gateway
 *
 * Main gateway coordinator that implements IPaymentGateway interface
 * Delegates operations to specialized services for each payment method
 *
 * Supported payment methods:
 * - QRIS (static & dynamic)
 * - Virtual Accounts (BCA, BNI, BRI, Mandiri, Permata)
 * - E-Wallets (GoPay, OVO, Dana, ShopeePay, LinkAja)
 * - Credit/Debit Cards
 * - Retail outlets (Alfamart, Indomaret)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IPaymentGateway,
  PaymentInput,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from '@domain/interfaces/services';
import type { XenditConfig, XenditWebhookPayload } from './types';

// Services
import { XenditQRISService } from './services/qris.service';
import { XenditVirtualAccountService } from './services/virtual-account.service';
import { XenditEwalletService } from './services/ewallet.service';
import { XenditRetailService } from './services/retail.service';
import { XenditInvoiceService } from './services/invoice.service';
import { XenditRefundService } from './services/refund.service';
import { XenditStatusService } from './services/status.service';
import { XenditWebhookService } from './services/webhook.service';
import { XenditUtilsService } from './services/utils.service';

@Injectable()
export class XenditGateway implements IPaymentGateway {
  private readonly logger = new Logger(XenditGateway.name);
  private readonly config: XenditConfig;

  // Service instances
  private readonly qrisService: XenditQRISService;
  private readonly vaService: XenditVirtualAccountService;
  private readonly ewalletService: XenditEwalletService;
  private readonly retailService: XenditRetailService;
  private readonly invoiceService: XenditInvoiceService;
  private readonly refundService: XenditRefundService;
  private readonly statusService: XenditStatusService;
  private readonly webhookService: XenditWebhookService;

  constructor(private readonly configService: ConfigService) {
    // Initialize configuration
    this.config = {
      apiKey: this.configService.get<string>('XENDIT_API_KEY', ''),
      webhookToken: this.configService.get<string>('XENDIT_WEBHOOK_TOKEN', ''),
      webhookUrl: this.configService.get<string>(
        'XENDIT_WEBHOOK_URL',
        'https://api.example.com/payments/xendit/callback',
      ),
      baseUrl: 'https://api.xendit.co',
    };

    if (!this.config.apiKey) {
      this.logger.warn('XENDIT_API_KEY not configured — Xendit gateway disabled');
    }

    // Initialize services
    this.qrisService = new XenditQRISService(this.config);
    this.vaService = new XenditVirtualAccountService(this.config);
    this.ewalletService = new XenditEwalletService(this.config);
    this.retailService = new XenditRetailService(this.config);
    this.invoiceService = new XenditInvoiceService(this.config);

    this.refundService = new XenditRefundService(
      this.qrisService,
      this.vaService,
      this.invoiceService,
    );

    this.statusService = new XenditStatusService(
      this.qrisService,
      this.vaService,
      this.ewalletService,
      this.invoiceService,
    );

    this.webhookService = new XenditWebhookService(this.config);
  }

  // ---------------------------------------------------------------------------
  // IPaymentGateway Interface Implementation
  // ---------------------------------------------------------------------------

  /**
   * Process payment using Xendit
   * Routes to appropriate payment method based on input.method
   */
  async processPayment(input: PaymentInput): Promise<PaymentResult> {
    if (!this.config.apiKey) {
      return this.errorResult('Xendit API key not configured');
    }

    try {
      // Normalize and validate payment method
      const normalizedMethod = XenditUtilsService.normalizePaymentMethod(input.method);

      // Validate amount
      const amountValidation = XenditUtilsService.validateAmount(
        input.amount,
        normalizedMethod.type,
      );
      if (!amountValidation.valid) {
        return this.errorResult(amountValidation.message || 'Invalid amount');
      }

      // Generate external ID
      const prefix = XenditUtilsService.getPaymentPrefix(normalizedMethod.type);
      const externalId = XenditUtilsService.generateExternalId(prefix, input.referenceNumber);

      // Route to appropriate service
      switch (normalizedMethod.type) {
        case 'QRIS':
          return this.qrisService.createPayment(input, externalId);

        case 'VA':
          if (!normalizedMethod.bankCode) {
            return this.errorResult('Bank code is required for Virtual Account payment');
          }
          return this.vaService.createPayment(input, externalId, normalizedMethod.bankCode);

        case 'EWALLET':
          if (!normalizedMethod.ewalletType) {
            return this.errorResult('E-wallet type is required');
          }
          return this.ewalletService.createPayment(input, externalId, normalizedMethod.ewalletType);

        case 'RETAIL':
          if (!normalizedMethod.retailOutlet) {
            return this.errorResult('Retail outlet is required');
          }
          return this.retailService.createPayment(input, externalId, normalizedMethod.retailOutlet);

        case 'CREDIT_CARD':
        default:
          return this.invoiceService.createPayment(input, externalId);
      }
    } catch (error) {
      this.logger.error(
        `Payment processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.errorResult('Payment processing failed');
    }
  }

  /**
   * Refund a payment via Xendit
   * Supports all payment methods except e-wallets (which require manual processing)
   */
  async refundPayment(
    transactionRef: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    if (!this.config.apiKey) {
      return {
        success: false,
        refundRef: '',
        message: 'Xendit API key not configured',
      };
    }

    try {
      return this.refundService.processRefund(transactionRef, amount, reason);
    } catch (error) {
      this.logger.error(`Refund failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        refundRef: '',
        message: 'Refund processing failed',
      };
    }
  }

  /**
   * Check payment status from Xendit
   * Automatically detects payment type and queries appropriate endpoint
   */
  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
    if (!this.config.apiKey) {
      return 'pending';
    }

    try {
      return this.statusService.checkStatus(transactionRef);
    } catch (error) {
      this.logger.error(
        `Status check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 'pending';
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook Handling
  // ---------------------------------------------------------------------------

  /**
   * Verify Xendit webhook signature
   * Uses HMAC SHA256 for verification
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    return this.webhookService.verifySignature(payload, signature);
  }

  /**
   * Parse webhook payload and extract payment status
   */
  parseWebhookPayload(payload: XenditWebhookPayload): {
    status: string;
    externalId: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
  } {
    if (!this.webhookService.validatePayload(payload)) {
      throw new Error('Invalid webhook payload structure');
    }

    this.webhookService.logWebhook(payload, true);

    return this.webhookService.parsePayload(payload);
  }

  /**
   * Validate webhook payload structure
   */
  validateWebhookPayload(payload: unknown): payload is XenditWebhookPayload {
    return this.webhookService.validatePayload(payload);
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Check if gateway is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return [
      'qris',
      'bca',
      'bni',
      'bri',
      'mandiri',
      'permata',
      'gopay',
      'ovo',
      'dana',
      'shopeepay',
      'linkaja',
      'alfamart',
      'indomaret',
      'credit_card',
    ];
  }

  /**
   * Get payment method name
   */
  getPaymentMethodName(method: string): string {
    return XenditUtilsService.getPaymentMethodName(method);
  }

  /**
   * Check if payment method supports refunds
   */
  supportsRefund(method: string): boolean {
    const normalized = XenditUtilsService.normalizePaymentMethod(method);
    return XenditUtilsService.supportsRefund(normalized.type);
  }

  // ---------------------------------------------------------------------------
  // Private Helper Methods
  // ---------------------------------------------------------------------------

  private errorResult(message: string): PaymentResult {
    return {
      success: false,
      transactionRef: '',
      message,
    };
  }
}
