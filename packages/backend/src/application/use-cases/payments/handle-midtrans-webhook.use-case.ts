import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Transaction, Payment } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface HandleWebhookParams {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  transactionId: string;
  transactionStatus: string;
  fraudStatus?: string;
}

export interface HandleWebhookResult {
  success: boolean;
  transactionStatus: string;
  transactionId: string;
  orderId: string;
}

@Injectable()
export class HandleMidtransWebhookUseCase {
  private readonly logger = new Logger(HandleMidtransWebhookUseCase.name);
  private readonly serverKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY', '');
  }

  async execute(params: HandleWebhookParams): Promise<HandleWebhookResult> {
    // Verify webhook signature
    if (params.signatureKey) {
      const expectedSignature = createHash('sha512')
        .update(`${params.orderId}${params.statusCode}${params.grossAmount}${this.serverKey}`)
        .digest('hex');

      if (params.signatureKey !== expectedSignature) {
        this.logger.error(`Invalid webhook signature for order ${params.orderId}`);
        throw new AppError(ErrorCode.UNAUTHORIZED_ACTION, 'Invalid webhook signature');
      }
    }

    // Find payment by referenceNumber (order_id from Midtrans)
    const payment = await this.prisma.payment.findFirst({
      where: { referenceNumber: params.orderId },
      include: {
        transaction: true,
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for order ${params.orderId}`);
      throw new AppError(
        ErrorCode.TRANSACTION_NOT_FOUND,
        `Payment not found for order ${params.orderId}`,
      );
    }

    // Idempotency check: if payment already has this status, return early
    const incomingStatus = this.mapWebhookStatusToPaymentStatus(params.transactionStatus);
    if (payment.status === incomingStatus) {
      this.logger.log(`Payment ${params.orderId} already has status '${incomingStatus}', skipping`);
      return {
        success: true,
        transactionStatus: params.transactionStatus,
        transactionId: params.transactionId,
        orderId: params.orderId,
      };
    }

    const transaction = payment.transaction;

    // Handle based on transaction status
    switch (params.transactionStatus) {
      case 'capture':
      case 'settlement':
        // Check fraud status before marking as completed
        if (params.fraudStatus === 'deny' || params.fraudStatus === 'challenge') {
          this.logger.warn(
            `Fraud detected for order ${params.orderId}: fraudStatus=${params.fraudStatus}`,
          );
          await this.handleFraudRejection(transaction, payment, params);
        } else {
          await this.handlePaymentSuccess(transaction, payment, params);
        }
        break;

      case 'deny':
      case 'cancel':
      case 'expire':
        await this.handlePaymentFailed(transaction, payment, params);
        break;

      case 'refund':
      case 'partial_refund':
        await this.handlePaymentRefund(transaction, payment, params);
        break;

      default:
        // For pending status, just log it
        this.logger.log(`Pending status for order ${params.orderId}`);
        break;
    }

    return {
      success: true,
      transactionStatus: params.transactionStatus,
      transactionId: params.transactionId,
      orderId: params.orderId,
    };
  }

  private mapWebhookStatusToPaymentStatus(transactionStatus: string): string {
    switch (transactionStatus) {
      case 'capture':
      case 'settlement':
        return 'completed';
      case 'deny':
      case 'cancel':
      case 'expire':
        return 'failed';
      case 'refund':
      case 'partial_refund':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private async handleFraudRejection(
    transaction: Transaction,
    payment: Payment,
    params: HandleWebhookParams,
  ): Promise<void> {
    const status = params.fraudStatus === 'challenge' ? 'pending_review' : 'failed';

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: status === 'pending_review' ? 'pending' : 'voided' },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });

    this.logger.warn(
      `Payment fraud rejection for order ${params.orderId}: fraudStatus=${params.fraudStatus}, action=${status}`,
    );
  }

  private async handlePaymentSuccess(
    transaction: Transaction,
    payment: Payment,
    params: HandleWebhookParams,
  ): Promise<void> {
    // Update transaction status to completed
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'completed' },
    });

    // Update payment record
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'completed' },
    });

    this.logger.log(`Payment successful for order ${params.orderId}`);
  }

  private async handlePaymentFailed(
    transaction: Transaction,
    payment: Payment,
    params: HandleWebhookParams,
  ): Promise<void> {
    // Update transaction status to voided (closest to failed for transactions)
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'voided' },
    });

    // Update payment record
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });

    this.logger.log(`Payment failed for order ${params.orderId}`);
  }

  private async handlePaymentRefund(
    transaction: Transaction,
    payment: Payment,
    params: HandleWebhookParams,
  ): Promise<void> {
    // Update transaction to refunded
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'refunded' },
    });

    // Update payment record
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'refunded' },
    });

    this.logger.log(`Payment refunded for order ${params.orderId}`);
  }
}
