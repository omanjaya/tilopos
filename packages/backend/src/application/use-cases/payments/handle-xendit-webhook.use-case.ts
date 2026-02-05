import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Payment, Transaction } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

// ============================================================================
// Types
// ============================================================================

export interface HandleXenditWebhookParams {
  event: string;
  externalId: string;
  status: string;
  amount: number;
  paymentMethod?: string;
  paymentChannel?: string;
  paidAt?: string;
  rawPayload: Record<string, unknown>;
}

export interface HandleXenditWebhookResult {
  success: boolean;
  event: string;
  externalId: string;
  status: string;
  message?: string;
}

// ============================================================================
// Use Case
// ============================================================================

@Injectable()
export class HandleXenditWebhookUseCase {
  private readonly logger = new Logger(HandleXenditWebhookUseCase.name);
  private readonly webhookToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.webhookToken = this.configService.get<string>('XENDIT_WEBHOOK_TOKEN', '');
  }

  // ---------------------------------------------------------------------------
  // Main Execute Method
  // ---------------------------------------------------------------------------

  async execute(params: HandleXenditWebhookParams): Promise<HandleXenditWebhookResult> {
    this.logger.log(
      `Processing Xendit webhook: event=${params.event}, externalId=${params.externalId}`,
    );

    try {
      // Find payment by external_id (which maps to our referenceNumber)
      const payment = await this.findPayment(params.externalId);

      if (!payment) {
        this.logger.warn(`Payment not found for external_id: ${params.externalId}`);
        // Return success to Xendit but log warning
        // This prevents retries for legitimate non-matching webhooks
        return {
          success: true,
          event: params.event,
          externalId: params.externalId,
          status: params.status,
          message: 'Payment not found, webhook acknowledged',
        };
      }

      // Idempotency check
      const mappedStatus = this.mapXenditStatusToPaymentStatus(params.status);
      if (payment.status === mappedStatus) {
        this.logger.log(
          `Payment ${params.externalId} already has status '${mappedStatus}', skipping`,
        );
        return {
          success: true,
          event: params.event,
          externalId: params.externalId,
          status: mappedStatus,
          message: 'Already processed',
        };
      }

      // Route based on event type
      const result = await this.handleEventType(params, payment);

      return {
        success: result.success,
        event: params.event,
        externalId: params.externalId,
        status: mappedStatus,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook Verification
  // ---------------------------------------------------------------------------

  verifyCallback(token: string): boolean {
    if (!this.webhookToken) {
      this.logger.warn('XENDIT_WEBHOOK_TOKEN not configured - skipping verification');
      return true;
    }

    return token === this.webhookToken;
  }

  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookToken) {
      this.logger.warn('XENDIT_WEBHOOK_TOKEN not configured - skipping signature verification');
      return true;
    }

    const expectedSignature = createHash('sha256')
      .update(payload + this.webhookToken)
      .digest('hex');

    return signature === expectedSignature;
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private async handleEventType(
    params: HandleXenditWebhookParams,
    payment: Payment & { transaction: Transaction },
  ): Promise<{ success: boolean; message: string }> {
    const event = params.event.toLowerCase();

    // Invoice events
    if (event.includes('invoice.paid')) {
      return this.handlePaymentSuccess(payment, params, 'Invoice paid');
    }
    if (event.includes('invoice.expired')) {
      return this.handlePaymentExpired(payment, params, 'Invoice expired');
    }

    // QRIS events
    if (event.includes('qr_code.paid') || event.includes('qris.paid')) {
      return this.handlePaymentSuccess(payment, params, 'QRIS paid');
    }
    if (event.includes('qr_code.expired')) {
      return this.handlePaymentExpired(payment, params, 'QRIS expired');
    }

    // Virtual Account events
    if (event.includes('payment_code.paid') || event.includes('va.paid')) {
      return this.handlePaymentSuccess(payment, params, 'VA paid');
    }
    if (event.includes('payment_code.expired')) {
      return this.handlePaymentExpired(payment, params, 'VA expired');
    }

    // E-Wallet events
    if (event.includes('ewallet.capture') || event.includes('ewallet.paid')) {
      return this.handlePaymentSuccess(payment, params, 'E-wallet captured');
    }
    if (event.includes('ewallet.void') || event.includes('ewallet.voided')) {
      return this.handlePaymentVoided(payment, params, 'E-wallet voided');
    }
    if (event.includes('ewallet.refund')) {
      return this.handlePaymentRefund(payment, params, 'E-wallet refunded');
    }

    // Retail outlet events
    if (event.includes('retail_outlet.paid') || event.includes('retail.paid')) {
      return this.handlePaymentSuccess(payment, params, 'Retail outlet paid');
    }
    if (event.includes('retail_outlet.expired')) {
      return this.handlePaymentExpired(payment, params, 'Retail outlet expired');
    }

    // Refund events
    if (event.includes('refund.completed')) {
      return this.handlePaymentRefund(payment, params, 'Refund completed');
    }
    if (event.includes('refund.failed')) {
      return this.handleRefundFailed(payment, params, 'Refund failed');
    }

    // Generic payment events
    if (event.includes('payment.succeeded')) {
      return this.handlePaymentSuccess(payment, params, 'Payment succeeded');
    }
    if (event.includes('payment.failed')) {
      return this.handlePaymentFailed(payment, params, 'Payment failed');
    }

    // Unknown event - acknowledge but don't process
    this.logger.log(`Unknown webhook event: ${params.event}`);
    return { success: true, message: 'Event acknowledged' };
  }

  // ---------------------------------------------------------------------------
  // Payment Status Handlers
  // ---------------------------------------------------------------------------

  private async handlePaymentSuccess(
    payment: Payment & { transaction: Transaction },
    params: HandleXenditWebhookParams,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    const transaction = payment.transaction;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          referenceNumber: params.externalId,
        },
      }),
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'completed' },
      }),
    ]);

    this.logger.log(`${message} for external_id: ${params.externalId}`);
    return { success: true, message };
  }

  private async handlePaymentExpired(
    payment: Payment & { transaction: Transaction },
    params: HandleXenditWebhookParams,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    const transaction = payment.transaction;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      }),
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'voided' },
      }),
    ]);

    this.logger.log(`${message} for external_id: ${params.externalId}`);
    return { success: true, message };
  }

  private async handlePaymentFailed(
    payment: Payment & { transaction: Transaction },
    params: HandleXenditWebhookParams,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    const transaction = payment.transaction;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      }),
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'voided' },
      }),
    ]);

    this.logger.log(`${message} for external_id: ${params.externalId}`);
    return { success: true, message };
  }

  private async handlePaymentVoided(
    payment: Payment & { transaction: Transaction },
    params: HandleXenditWebhookParams,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    const transaction = payment.transaction;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      }),
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'voided' },
      }),
    ]);

    this.logger.log(`${message} for external_id: ${params.externalId}`);
    return { success: true, message };
  }

  private async handlePaymentRefund(
    payment: Payment & { transaction: Transaction },
    params: HandleXenditWebhookParams,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    const transaction = payment.transaction;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'refunded' },
      }),
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'refunded' },
      }),
    ]);

    this.logger.log(`${message} for external_id: ${params.externalId}`);
    return { success: true, message };
  }

  private async handleRefundFailed(
    _payment: Payment & { transaction: Transaction },
    params: HandleXenditWebhookParams,
    message: string,
  ): Promise<{ success: boolean; message: string }> {
    // Don't change payment status on refund failure, just log
    this.logger.warn(`${message} for external_id: ${params.externalId}`);
    return { success: true, message };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async findPayment(externalId: string) {
    // Try different patterns for external_id
    // Xendit prefixes: INV_, QRIS_, VA_, EW_, RETAIL_
    const cleanId = this.cleanExternalId(externalId);

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { referenceNumber: externalId },
          { referenceNumber: cleanId },
          { referenceNumber: { contains: cleanId } },
        ],
      },
      include: {
        transaction: true,
      },
    });

    return payment;
  }

  private cleanExternalId(externalId: string): string {
    // Remove Xendit prefixes to get original reference
    const prefixes = ['INV_', 'QRIS_', 'VA_', 'EW_', 'RETAIL_', 'QR_'];
    let cleaned = externalId;

    for (const prefix of prefixes) {
      if (cleaned.toUpperCase().startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length);
        break;
      }
    }

    return cleaned;
  }

  private mapXenditStatusToPaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      // Xendit statuses
      PAID: 'completed',
      SETTLED: 'completed',
      COMPLETED: 'completed',
      CAPTURED: 'completed',
      SUCCEEDED: 'completed',
      PENDING: 'pending',
      ACTIVE: 'pending',
      EXPIRED: 'failed',
      FAILED: 'failed',
      VOIDED: 'failed',
      CANCELLED: 'failed',
      REFUNDED: 'refunded',
      // Lowercase variants
      paid: 'completed',
      settled: 'completed',
      completed: 'completed',
      pending: 'pending',
      expired: 'failed',
      failed: 'failed',
      voided: 'failed',
      refunded: 'refunded',
    };

    return statusMap[status] || 'pending';
  }
}
