/**
 * Xendit Status Service
 *
 * Handles payment status checking across all payment methods
 * Coordinates status checks and provides unified status responses
 */

import { Logger } from '@nestjs/common';
import type { PaymentStatus } from '@domain/interfaces/services';
import { XenditQRISService } from './qris.service';
import { XenditVirtualAccountService } from './virtual-account.service';
import { XenditEwalletService } from './ewallet.service';
import { XenditInvoiceService } from './invoice.service';

export class XenditStatusService {
  private readonly logger = new Logger(XenditStatusService.name);

  constructor(
    private readonly qrisService: XenditQRISService,
    private readonly vaService: XenditVirtualAccountService,
    private readonly ewalletService: XenditEwalletService,
    private readonly invoiceService: XenditInvoiceService,
  ) {}

  /**
   * Check payment status for any payment type
   * Automatically detects payment type and routes to appropriate service
   */
  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
    try {
      const paymentType = this.extractPaymentType(transactionRef);

      switch (paymentType) {
        case 'invoice':
          return this.invoiceService.getStatus(transactionRef);

        case 'qrcode':
          return this.qrisService.getStatus(transactionRef);

        case 'va':
          return this.vaService.getStatus(transactionRef);

        case 'ewallet':
          return this.ewalletService.getStatus(transactionRef);

        default:
          // Try to determine status by attempting different endpoints
          return this.tryAllStatusChecks(transactionRef);
      }
    } catch (error) {
      this.logger.error(
        `Status check failed for ${transactionRef}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 'pending';
    }
  }

  /**
   * Try checking status with all available methods
   * Used when payment type cannot be determined from transaction reference
   */
  private async tryAllStatusChecks(transactionRef: string): Promise<PaymentStatus> {
    this.logger.log(`Attempting status check with multiple methods for: ${transactionRef}`);

    // Try invoice status
    const invoiceStatus = await this.invoiceService.getStatus(transactionRef).catch(() => null);
    if (invoiceStatus && invoiceStatus !== 'pending') {
      this.logger.log(`Status found as invoice: ${transactionRef} = ${invoiceStatus}`);
      return invoiceStatus;
    }

    // Try QRIS status
    const qrStatus = await this.qrisService.getStatus(transactionRef).catch(() => null);
    if (qrStatus && qrStatus !== 'pending') {
      this.logger.log(`Status found as QRIS: ${transactionRef} = ${qrStatus}`);
      return qrStatus;
    }

    // Try VA status
    const vaStatus = await this.vaService.getStatus(transactionRef).catch(() => null);
    if (vaStatus && vaStatus !== 'pending') {
      this.logger.log(`Status found as VA: ${transactionRef} = ${vaStatus}`);
      return vaStatus;
    }

    // E-wallet status relies on webhooks, return pending
    this.logger.warn(`Unable to determine status for: ${transactionRef}`);
    return 'pending';
  }

  /**
   * Extract payment type from transaction reference
   * Based on Xendit's ID patterns and common prefixes
   */
  private extractPaymentType(
    transactionRef: string,
  ): 'invoice' | 'qrcode' | 'va' | 'ewallet' | 'unknown' {
    const ref = transactionRef.toLowerCase();

    // Invoice IDs typically start with specific patterns
    if (ref.startsWith('inv_') || ref.match(/^[0-9a-f]{24}$/)) {
      return 'invoice';
    }

    // QR code IDs
    if (ref.startsWith('qr_') || ref.includes('qris')) {
      return 'qrcode';
    }

    // Virtual Account / Payment Code IDs
    if (ref.startsWith('va_') || ref.startsWith('pc_')) {
      return 'va';
    }

    // E-wallet external IDs
    if (ref.startsWith('ew_') || ref.includes('ewallet')) {
      return 'ewallet';
    }

    return 'unknown';
  }

  /**
   * Check if payment is in a final state (completed or failed)
   */
  isFinalStatus(status: PaymentStatus): boolean {
    return status === 'completed' || status === 'failed' || status === 'refunded';
  }

  /**
   * Check if payment can be refunded
   */
  canRefund(status: PaymentStatus): boolean {
    return status === 'completed';
  }
}
