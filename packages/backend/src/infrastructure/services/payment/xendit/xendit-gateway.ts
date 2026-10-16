/**
 * Xendit Payment Gateway
 *
 * Implements IPaymentGateway by delegating to one service per Xendit product
 * (QRIS, virtual accounts, e-wallet charges, retail payment codes, invoices).
 *
 * Contract (see ProcessMultiPaymentUseCase / webhooks):
 * - `input.referenceNumber` (our Payment/Invoice id) is sent unchanged as the
 *   Xendit external_id / reference_id, so callbacks map 1:1 to our record.
 * - `success: true` means Xendit accepted the request, NOT that it is paid;
 *   `paymentData.paymentStatus` ('pending' | 'completed' | 'failed') carries the
 *   confirmation state. Payments are confirmed by callbacks.
 * - `transactionRef` is `<kind>:<xenditId>` so status checks and refunds hit
 *   the correct API.
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
import type { XenditConfig } from './types';
import { AppError, ErrorCode } from '../../../../shared/errors/app-error';

import { XenditQRISService } from './services/qris.service';
import { XenditVirtualAccountService } from './services/virtual-account.service';
import { XenditEwalletService } from './services/ewallet.service';
import { XenditRetailService } from './services/retail.service';
import { XenditInvoiceService } from './services/invoice.service';
import { XenditRefundService } from './services/refund.service';
import { XenditStatusService } from './services/status.service';
import { XenditUtilsService } from './services/utils.service';
import { XenditApiError } from './services/base.service';

@Injectable()
export class XenditGateway implements IPaymentGateway {
  private readonly logger = new Logger(XenditGateway.name);
  private readonly config: XenditConfig;

  private readonly qrisService: XenditQRISService;
  private readonly vaService: XenditVirtualAccountService;
  private readonly ewalletService: XenditEwalletService;
  private readonly retailService: XenditRetailService;
  private readonly invoiceService: XenditInvoiceService;
  private readonly refundService: XenditRefundService;
  private readonly statusService: XenditStatusService;

  constructor(private readonly configService: ConfigService) {
    // Required keys are enforced at boot for PAYMENT_GATEWAY=xendit in production
    // (config/env.validation.ts); without a key every call fails explicitly below.
    this.config = {
      apiKey: this.configService.get<string>('XENDIT_API_KEY') ?? '',
      webhookToken: this.configService.get<string>('XENDIT_WEBHOOK_TOKEN') ?? '',
      webhookUrl: this.configService.get<string>('XENDIT_WEBHOOK_URL') ?? '',
      baseUrl: 'https://api.xendit.co',
    };

    if (!this.config.apiKey) {
      this.logger.warn('XENDIT_API_KEY not configured — Xendit gateway calls will fail');
    }

    this.qrisService = new XenditQRISService(this.config);
    this.vaService = new XenditVirtualAccountService(this.config);
    this.ewalletService = new XenditEwalletService(this.config);
    this.retailService = new XenditRetailService(this.config);
    this.invoiceService = new XenditInvoiceService(this.config);
    this.refundService = new XenditRefundService(this.invoiceService);
    this.statusService = new XenditStatusService(
      this.qrisService,
      this.vaService,
      this.ewalletService,
      this.invoiceService,
      this.retailService,
    );
  }

  async processPayment(input: PaymentInput): Promise<PaymentResult> {
    if (!this.config.apiKey) {
      return this.errorResult('Xendit API key not configured');
    }

    const normalized = XenditUtilsService.normalizePaymentMethod(input.method);
    if (!normalized) {
      return this.errorResult(`Payment method "${input.method}" is not supported by Xendit`);
    }

    const amountValidation = XenditUtilsService.validateAmount(input.amount, normalized.type);
    if (!amountValidation.valid) {
      return this.errorResult(amountValidation.message || 'Invalid amount');
    }

    const externalId = XenditUtilsService.generateExternalId(input.referenceNumber);

    try {
      switch (normalized.type) {
        case 'QRIS':
          return await this.qrisService.createPayment(input, externalId);
        case 'VA':
          return await this.vaService.createPayment(input, externalId, normalized.bankCode ?? '');
        case 'EWALLET':
          return await this.ewalletService.createPayment(
            input,
            externalId,
            normalized.ewalletType ?? '',
          );
        case 'RETAIL':
          return await this.retailService.createPayment(
            input,
            externalId,
            normalized.retailOutlet ?? '',
          );
        case 'CREDIT_CARD':
          return await this.invoiceService.createPayment(
            {
              ...input,
              paymentMethods: input.paymentMethods?.length ? input.paymentMethods : ['CREDIT_CARD'],
            },
            externalId,
          );
        case 'INVOICE':
          return await this.invoiceService.createPayment(input, externalId);
      }
    } catch (error) {
      if (error instanceof XenditApiError && error.outcomeUnknown) {
        // The request may have reached Xendit: never report this as a clean failure
        // without flagging it; the callback (matched by externalId) settles it.
        this.logger.error(
          `Xendit create for ${externalId} has unknown outcome (${error.message}); reconcile via callback/status`,
        );
        return {
          success: false,
          transactionRef: '',
          message: `Payment gateway did not answer: ${error.message}`,
          paymentData: { paymentStatus: 'pending', outcomeUnknown: true, externalId },
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(`Xendit rejected the payment: ${message}`);
    }
  }

  async refundPayment(
    transactionRef: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    if (!this.config.apiKey) {
      return { success: false, refundRef: '', message: 'Xendit API key not configured' };
    }
    return await this.refundService.processRefund(transactionRef, amount, reason);
  }

  /**
   * Throws when the status cannot be determined (missing key, API/network
   * error) instead of reporting 'pending'.
   */
  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
    if (!this.config.apiKey) {
      throw new AppError(ErrorCode.CONFIGURATION_ERROR, 'Xendit API key not configured');
    }
    return await this.statusService.checkStatus(transactionRef);
  }

  private errorResult(message: string): PaymentResult {
    return {
      success: false,
      transactionRef: '',
      message,
      paymentData: { paymentStatus: 'failed' },
    };
  }
}
