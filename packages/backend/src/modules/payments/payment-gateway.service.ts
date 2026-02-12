/**
 * Payment Gateway Service (Aggregator)
 *
 * Aggregates multiple payment gateways:
 * - Xendit (QRIS, VA, E-Wallet, Cards)
 * - Midtrans (QRIS, VA, E-Wallet, Cards)
 * - EDC Terminal
 * - Cash
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { XenditGateway } from '../../infrastructure/services/payment/xendit/xendit-gateway';
import { MidtransGateway } from '../../infrastructure/services/payment/midtrans-gateway';
import { PaymentGatewayFactory } from '../../infrastructure/services/payment/payment-gateway.factory';
import type { PaymentInput } from '../../domain/interfaces/services/payment-gateway';

// ============================================================================
// Types
// ============================================================================

export interface PaymentRequest {
  transactionId: string;
  amount: number;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  referenceNumber?: string;
  status: PaymentStatus;
  message?: string;
  qrCode?: string; // For QRIS
  vaNumber?: string; // For VA
  checkoutUrl?: string; // For redirect-based
  expiresAt?: Date;
}

export interface PaymentCallback {
  provider: string;
  referenceNumber: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

// ============================================================================
// EDC Terminal Gateway (Placeholder)
// ============================================================================

@Injectable()
export class EDCGateway {
  private readonly logger = new Logger(EDCGateway.name);
  readonly name = 'edc';
  readonly supportedMethods: PaymentMethod[] = ['card'];

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logger.log(`EDC payment request: ${request.amount}`);

    // In production, communicate with EDC terminal
    // via TCP/IP or serial port
    return {
      success: true,
      referenceNumber: `EDC_${Date.now()}`,
      status: 'pending',
      message: 'Please insert card on EDC terminal',
    };
  }

  async confirmPayment(referenceNumber: string, approvalCode: string): Promise<PaymentResult> {
    this.logger.log(`EDC payment confirmed: ${referenceNumber} - ${approvalCode}`);

    return {
      success: true,
      referenceNumber,
      status: 'completed',
    };
  }

  async checkStatus(referenceNumber: string): Promise<PaymentStatus> {
    this.logger.log(`Checking EDC status for ${referenceNumber}`);
    return 'pending';
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    this.logger.log(`EDC refund request: ${request.paymentId}`);

    return {
      success: true,
      refundId: `REF_EDC_${Date.now()}`,
      status: 'pending',
      message: 'Please process refund on EDC terminal',
    };
  }
}

// ============================================================================
// Cash Payment (Internal)
// ============================================================================

@Injectable()
export class CashGateway {
  readonly name = 'cash';
  readonly supportedMethods: PaymentMethod[] = ['cash'];

  async createPayment(_request: PaymentRequest): Promise<PaymentResult> {
    return {
      success: true,
      referenceNumber: `CASH_${Date.now()}`,
      status: 'completed',
    };
  }

  async checkStatus(_referenceNumber: string): Promise<PaymentStatus> {
    return 'completed';
  }

  async refund(_request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `REF_CASH_${Date.now()}`,
      status: 'completed',
      message: 'Return cash to customer',
    };
  }
}

// ============================================================================
// Payment Gateway Service (Aggregator)
// ============================================================================

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xenditGateway: XenditGateway,
    private readonly midtransGateway: MidtransGateway,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly edcGateway: EDCGateway,
    private readonly cashGateway: CashGateway,
  ) {}

  // ===========================================================================
  // Process Payment
  // ===========================================================================

  async processPayment(
    transactionId: string,
    amount: number,
    method: PaymentMethod,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentResult> {
    this.logger.log(`Processing payment: ${method} for ${amount}`);

    // Get appropriate gateway
    const gatewayInfo = this.getGatewayForMethod(method);

    try {
      let result: PaymentResult;

      if (gatewayInfo.type === 'cash') {
        result = await this.cashGateway.createPayment({ transactionId, amount, method, metadata });
      } else if (gatewayInfo.type === 'edc') {
        result = await this.edcGateway.createPayment({ transactionId, amount, method, metadata });
      } else {
        // Use Xendit or Midtrans
        const gateway = this.gatewayFactory.getGateway(gatewayInfo.provider);
        const paymentInput: PaymentInput = {
          method: this.mapMethodToGatewayMethod(method),
          amount,
          referenceNumber: transactionId,
          description: `Payment for transaction ${transactionId}`,
          customer: metadata?.customer as PaymentInput['customer'],
        };

        const gatewayResult = await gateway.processPayment(paymentInput);

        result = {
          success: gatewayResult.success,
          referenceNumber: gatewayResult.transactionRef,
          status: gatewayResult.success ? 'pending' : 'failed',
          message: gatewayResult.message,
          qrCode: gatewayResult.paymentData?.qrString as string | undefined,
          vaNumber: gatewayResult.paymentData?.accountNumber as string | undefined,
          checkoutUrl:
            (gatewayResult.paymentData?.checkoutUrl as string | undefined) ||
            (gatewayResult.paymentData?.invoiceUrl as string | undefined),
          expiresAt: gatewayResult.paymentData?.expiresAt
            ? new Date(gatewayResult.paymentData.expiresAt as string)
            : undefined,
        };
      }

      // Create payment record
      if (result.success) {
        await this.createPaymentRecord(transactionId, amount, method, result, gatewayInfo.provider);
      }

      return result;
    } catch (error) {
      this.logger.error(`Payment failed: ${error instanceof Error ? error.message : error}`);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  // ===========================================================================
  // Process Payment with Specific Gateway
  // ===========================================================================

  async processWithXendit(
    transactionId: string,
    amount: number,
    method: string,
    customer?: { name: string; email?: string; phone?: string },
  ): Promise<PaymentResult> {
    const paymentInput: PaymentInput = {
      method,
      amount,
      referenceNumber: transactionId,
      description: `Payment for transaction ${transactionId}`,
      customer,
    };

    const result = await this.xenditGateway.processPayment(paymentInput);

    const paymentResult: PaymentResult = {
      success: result.success,
      referenceNumber: result.transactionRef,
      status: result.success ? 'pending' : 'failed',
      message: result.message,
      qrCode: result.paymentData?.qrString as string | undefined,
      vaNumber: result.paymentData?.accountNumber as string | undefined,
      checkoutUrl:
        (result.paymentData?.checkoutUrl as string | undefined) ||
        (result.paymentData?.invoiceUrl as string | undefined),
      expiresAt: result.paymentData?.expiresAt
        ? new Date(result.paymentData.expiresAt as string)
        : undefined,
    };

    if (paymentResult.success) {
      await this.createPaymentRecord(
        transactionId,
        amount,
        method as PaymentMethod,
        paymentResult,
        'xendit',
      );
    }

    return paymentResult;
  }

  async processWithMidtrans(
    transactionId: string,
    amount: number,
    method: string,
    customer?: { name: string; email?: string; phone?: string },
  ): Promise<PaymentResult> {
    const paymentInput: PaymentInput = {
      method,
      amount,
      referenceNumber: transactionId,
      description: `Payment for transaction ${transactionId}`,
      metadata: { customer },
    };

    const result = await this.midtransGateway.processPayment(paymentInput);

    const paymentResult: PaymentResult = {
      success: result.success,
      referenceNumber: result.transactionRef,
      status: result.success ? 'pending' : 'failed',
      message: result.message,
    };

    if (paymentResult.success) {
      await this.createPaymentRecord(
        transactionId,
        amount,
        method as PaymentMethod,
        paymentResult,
        'midtrans',
      );
    }

    return paymentResult;
  }

  // ===========================================================================
  // Handle Callback
  // ===========================================================================

  async handleCallback(callback: PaymentCallback): Promise<void> {
    this.logger.log(`Payment callback received: ${callback.referenceNumber} - ${callback.status}`);

    const payment = await this.prisma.payment.findFirst({
      where: { referenceNumber: callback.referenceNumber },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${callback.referenceNumber}`);
      return;
    }

    const status =
      callback.status === 'success'
        ? 'completed'
        : callback.status === 'failed'
          ? 'failed'
          : 'pending';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        metadata: {
          ...(payment.metadata as Record<string, unknown>),
          paidAt: callback.paidAt?.toISOString() ?? null,
          callbackData: callback.metadata ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Update transaction status if payment completed
    if (status === 'completed') {
      await this.prisma.transaction.update({
        where: { id: payment.transactionId },
        data: { status: 'completed' },
      });
    }
  }

  // ===========================================================================
  // Process Refund
  // ===========================================================================

  async processRefund(paymentId: string, amount: number, reason: string): Promise<RefundResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (amount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    const metadata = payment.metadata as Record<string, unknown>;
    const gatewayName = (metadata?.gateway as string) || 'cash';

    let result: RefundResult;

    if (gatewayName === 'cash') {
      result = await this.cashGateway.refund({ paymentId, amount, reason });
    } else if (gatewayName === 'edc') {
      result = await this.edcGateway.refund({ paymentId, amount, reason });
    } else {
      // Use Xendit or Midtrans
      const gateway = this.gatewayFactory.getGateway(gatewayName);
      const gatewayResult = await gateway.refundPayment(
        payment.referenceNumber || '',
        amount,
        reason,
      );

      result = {
        success: gatewayResult.success,
        refundId: gatewayResult.refundRef,
        status: gatewayResult.success ? 'completed' : 'failed',
        message: gatewayResult.message,
      };
    }

    if (result.success) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'refunded',
          metadata: {
            ...metadata,
            refundId: result.refundId,
            refundAmount: amount,
            refundReason: reason,
            refundedAt: new Date().toISOString(),
          },
        },
      });
    }

    return result;
  }

  // ===========================================================================
  // Check Payment Status
  // ===========================================================================

  async checkPaymentStatus(paymentId: string): Promise<{
    status: PaymentStatus;
    referenceNumber?: string;
  }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // For pending payments, check with gateway
    if (payment.status === 'pending' && payment.referenceNumber) {
      const metadata = payment.metadata as Record<string, unknown>;
      const gatewayName = (metadata?.gateway as string) || 'cash';

      if (gatewayName !== 'cash' && gatewayName !== 'edc') {
        const gateway = this.gatewayFactory.getGateway(gatewayName);
        const status = await gateway.checkStatus(payment.referenceNumber);

        const mappedStatus = this.mapGatewayStatusToPaymentStatus(status);
        if (mappedStatus !== payment.status) {
          await this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: mappedStatus },
          });
          return { status: mappedStatus, referenceNumber: payment.referenceNumber };
        }
      }
    }

    return {
      status: payment.status,
      referenceNumber: payment.referenceNumber || undefined,
    };
  }

  // ===========================================================================
  // Get Available Methods
  // ===========================================================================

  async getAvailableMethods(_outletId: string): Promise<
    {
      method: PaymentMethod;
      name: string;
      gateway: string;
      enabled: boolean;
    }[]
  > {
    // In production, load from outlet settings
    // Note: LinkAja not in Prisma PaymentMethod enum, would need schema migration to add
    return [
      { method: 'cash', name: 'Cash', gateway: 'cash', enabled: true },
      { method: 'qris', name: 'QRIS', gateway: 'xendit', enabled: true },
      { method: 'card', name: 'Debit/Credit Card', gateway: 'xendit', enabled: true },
      { method: 'gopay', name: 'GoPay', gateway: 'xendit', enabled: true },
      { method: 'ovo', name: 'OVO', gateway: 'xendit', enabled: true },
      { method: 'dana', name: 'DANA', gateway: 'xendit', enabled: true },
      { method: 'shopeepay', name: 'ShopeePay', gateway: 'xendit', enabled: true },
      { method: 'bank_transfer', name: 'Bank Transfer', gateway: 'xendit', enabled: true },
    ];
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private getGatewayForMethod(method: PaymentMethod): {
    type: 'cash' | 'edc' | 'gateway';
    provider: string;
  } {
    switch (method) {
      case 'cash':
        return { type: 'cash', provider: 'cash' };
      case 'card':
        // Check if EDC is configured, otherwise use Xendit
        return { type: 'gateway', provider: 'xendit' };
      case 'qris':
      case 'gopay':
      case 'ovo':
      case 'dana':
      case 'shopeepay':
      case 'bank_transfer':
      case 'credit_note':
        return { type: 'gateway', provider: 'xendit' };
      default:
        return { type: 'gateway', provider: 'xendit' };
    }
  }

  private mapMethodToGatewayMethod(method: PaymentMethod): string {
    const methodMap: Record<PaymentMethod, string> = {
      cash: 'cash',
      qris: 'qris',
      card: 'credit_card',
      debit_card: 'debit_card',
      credit_card: 'credit_card',
      gopay: 'gopay',
      ovo: 'ovo',
      dana: 'dana',
      shopeepay: 'shopeepay',
      linkaja: 'linkaja',
      bank_transfer: 'bca', // Default to BCA
      credit_note: 'credit_note',
    };
    return methodMap[method] || method;
  }

  private mapGatewayStatusToPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private async createPaymentRecord(
    transactionId: string,
    amount: number,
    method: PaymentMethod,
    result: PaymentResult,
    provider: string,
  ): Promise<void> {
    await this.prisma.payment.create({
      data: {
        transactionId,
        paymentMethod: method,
        amount,
        referenceNumber: result.referenceNumber,
        status: result.status,
        metadata: {
          gateway: provider,
          qrCode: result.qrCode ?? null,
          vaNumber: result.vaNumber ?? null,
          checkoutUrl: result.checkoutUrl ?? null,
          expiresAt: result.expiresAt?.toISOString() ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
