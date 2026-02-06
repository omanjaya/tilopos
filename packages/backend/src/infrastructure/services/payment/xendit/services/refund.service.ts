/**
 * Xendit Refund Service
 *
 * Handles refund operations for all Xendit payment methods
 * Coordinates refunds across different payment types
 */

import { Logger } from '@nestjs/common';
import type { RefundResult } from '@domain/interfaces/services';
import { XenditQRISService } from './qris.service';
import { XenditVirtualAccountService } from './virtual-account.service';
import { XenditInvoiceService } from './invoice.service';

export class XenditRefundService {
  private readonly logger = new Logger(XenditRefundService.name);

  constructor(
    private readonly qrisService: XenditQRISService,
    private readonly vaService: XenditVirtualAccountService,
    private readonly invoiceService: XenditInvoiceService,
  ) {}

  /**
   * Process a refund for any payment type
   * Automatically detects payment type and routes to appropriate service
   */
  async processRefund(
    transactionRef: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    try {
      const paymentType = this.extractPaymentType(transactionRef);

      switch (paymentType) {
        case 'invoice':
          return this.refundInvoice(transactionRef, amount, reason);

        case 'qrcode':
          return this.refundQRCode(transactionRef, amount, reason);

        case 'va':
          return this.refundVA(transactionRef, amount, reason);

        case 'ewallet':
          // E-wallets typically don't support refunds through API
          // They need to be processed manually or through customer support
          this.logger.warn(
            `E-wallet refund requested for ${transactionRef} - manual processing required`,
          );
          return {
            success: false,
            refundRef: '',
            message: 'E-wallet refunds must be processed manually',
          };

        default:
          // Try all methods if type cannot be determined
          return this.tryAllRefundMethods(transactionRef, amount, reason);
      }
    } catch (error) {
      this.logger.error(
        `Refund processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        refundRef: '',
        message: 'Refund processing failed',
      };
    }
  }

  /**
   * Refund an invoice payment
   */
  private async refundInvoice(
    invoiceId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const success = await this.invoiceService.refund(invoiceId, amount, reason);

    if (!success) {
      return {
        success: false,
        refundRef: '',
        message: 'Invoice refund failed',
      };
    }

    return {
      success: true,
      refundRef: invoiceId,
      message: 'Invoice refund processed successfully',
    };
  }

  /**
   * Refund a QRIS payment
   */
  private async refundQRCode(
    qrCodeId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const success = await this.qrisService.refund(qrCodeId, amount, reason);

    if (!success) {
      return {
        success: false,
        refundRef: '',
        message: 'QRIS refund failed',
      };
    }

    return {
      success: true,
      refundRef: qrCodeId,
      message: 'QRIS refund processed successfully',
    };
  }

  /**
   * Refund a Virtual Account payment
   */
  private async refundVA(
    paymentCodeId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const success = await this.vaService.refund(paymentCodeId, amount, reason);

    if (!success) {
      return {
        success: false,
        refundRef: '',
        message: 'Virtual Account refund failed',
      };
    }

    return {
      success: true,
      refundRef: paymentCodeId,
      message: 'Virtual Account refund processed successfully',
    };
  }

  /**
   * Try refunding with all available methods
   * Used when payment type cannot be determined from transaction reference
   */
  private async tryAllRefundMethods(
    refId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    this.logger.log(`Attempting refund with multiple methods for: ${refId}`);

    // Try invoice refund
    const invoiceResult = await this.refundInvoice(refId, amount, reason).catch(() => null);
    if (invoiceResult?.success) {
      this.logger.log(`Successfully refunded as invoice: ${refId}`);
      return invoiceResult;
    }

    // Try QRIS refund
    const qrResult = await this.refundQRCode(refId, amount, reason).catch(() => null);
    if (qrResult?.success) {
      this.logger.log(`Successfully refunded as QRIS: ${refId}`);
      return qrResult;
    }

    // Try VA refund
    const vaResult = await this.refundVA(refId, amount, reason).catch(() => null);
    if (vaResult?.success) {
      this.logger.log(`Successfully refunded as VA: ${refId}`);
      return vaResult;
    }

    this.logger.error(`All refund methods failed for: ${refId}`);
    return {
      success: false,
      refundRef: '',
      message: 'Refund failed - payment not found or unsupported payment type',
    };
  }

  /**
   * Extract payment type from transaction reference
   * Based on Xendit's ID patterns
   */
  private extractPaymentType(
    transactionRef: string,
  ): 'invoice' | 'qrcode' | 'va' | 'ewallet' | 'unknown' {
    const ref = transactionRef.toLowerCase();

    if (ref.startsWith('inv_') || ref.includes('invoice')) {
      return 'invoice';
    }

    if (ref.startsWith('qr_') || ref.includes('qris')) {
      return 'qrcode';
    }

    if (ref.startsWith('va_') || ref.includes('payment_code')) {
      return 'va';
    }

    if (ref.startsWith('ew_') || ref.includes('ewallet')) {
      return 'ewallet';
    }

    return 'unknown';
  }
}
