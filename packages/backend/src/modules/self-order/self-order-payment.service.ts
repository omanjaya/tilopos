import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError, ErrorCode } from '@shared/errors/app-error';
import { money } from '@shared/utils/money';
import { secureToken } from '@shared/utils/secure-code';
import type {
  SelfOrderCallbackStatus,
  SelfOrderPaymentMethod,
} from '@application/dtos/self-order-features.dto';
import {
  computeSessionTotals,
  loadModifiers,
  modifierIdsOf,
  type SessionTotals,
} from './self-order-pricing';

export interface CreatePaymentInput {
  sessionCode: string;
  paymentMethod: SelfOrderPaymentMethod;
  amount: number;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  paymentMethod: string;
  message?: string;
}

/**
 * Self-order payments.
 *
 * Only pay-at-counter (cash) is supported. No QRIS / e-wallet gateway is
 * integrated for self-order, so those methods fail honestly with 501
 * NOT_CONFIGURED instead of returning a placeholder QR code (R10).
 *
 * The kitchen order is created exactly once, by submitSession. Payment
 * callbacks only move the session submitted -> paid (idempotent) and never
 * create kitchen orders.
 */
@Injectable()
export class SelfOrderPaymentService {
  private readonly logger = new Logger(SelfOrderPaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateSessionTotal(sessionCode: string): Promise<SessionTotals> {
    const totals = await this.computeTotals(sessionCode);
    return {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      serviceChargeAmount: totals.serviceChargeAmount,
      grandTotal: totals.grandTotal,
      itemCount: totals.itemCount,
    };
  }

  private async computeTotals(sessionCode: string) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode },
      select: {
        outlet: { select: { businessId: true, taxRate: true, serviceCharge: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            modifiers: true,
            product: { select: { basePrice: true } },
            variant: { select: { price: true } },
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const modifiers = await loadModifiers(
      this.prisma,
      session.outlet.businessId,
      session.items.flatMap((i) => modifierIdsOf(i.modifiers)),
    );
    return computeSessionTotals(
      session.items,
      modifiers,
      session.outlet.taxRate,
      session.outlet.serviceCharge,
    );
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    if (input.paymentMethod !== 'cash') {
      throw new NotImplementedException({
        success: false,
        reason: 'NOT_CONFIGURED',
        message: `Payment method ${input.paymentMethod} is not available for self-order. Please pay at the counter.`,
      });
    }

    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode: input.sessionCode },
      select: { id: true, status: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== 'submitted') {
      throw new BadRequestException('Session must be submitted before payment');
    }

    const totals = await this.computeTotals(input.sessionCode);
    if (!money(input.amount).equals(totals.grandTotalDecimal)) {
      throw new BadRequestException('Payment amount does not match order total');
    }

    const transactionId = `SO-${secureToken(12)}`;
    const updated = await this.prisma.selfOrderSession.updateMany({
      where: { id: session.id, status: 'submitted' },
      data: {
        paymentRef: transactionId,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pending',
        paymentAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Session payment state changed, please retry');
    }

    this.logger.log(`Cash (pay at counter) payment registered for session ${session.id}`);
    return {
      success: true,
      transactionId,
      paymentMethod: 'cash',
      message: 'Please proceed to the counter to complete your cash payment.',
    };
  }

  /** QRIS shortcut: no gateway is integrated for self-order. */
  async initiateQRISPayment(_sessionCode: string, _amount: number): Promise<PaymentResult> {
    throw new NotImplementedException({
      success: false,
      reason: 'NOT_CONFIGURED',
      message: 'QRIS payment is not available for self-order. Please pay at the counter.',
    });
  }

  /**
   * Payment callback (webhook). Matches the session by the exact payment
   * reference we issued and applies the status with conditional updates, so a
   * replayed/duplicated callback is a no-op. It never creates a kitchen order:
   * that already happened, once, on submit.
   */
  async handlePaymentCallback(
    paymentRef: string,
    status: SelfOrderCallbackStatus,
  ): Promise<{ applied: boolean; sessionStatus: string }> {
    const session = await this.prisma.selfOrderSession.findFirst({
      where: { paymentRef },
      select: { id: true, status: true },
    });
    if (!session) {
      this.logger.warn(`Self-order payment callback for unknown reference`);
      throw new AppError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Unknown payment reference',
        HttpStatus.NOT_FOUND,
      );
    }

    if (status === 'success') {
      const res = await this.prisma.selfOrderSession.updateMany({
        where: { id: session.id, paymentRef, status: 'submitted' },
        data: { status: 'paid', paymentStatus: 'success' },
      });
      if (res.count === 1) {
        this.logger.log(`Self-order session ${session.id} marked as paid via callback`);
        return { applied: true, sessionStatus: 'paid' };
      }
      // Already paid (replay) or not in a payable state: nothing to do.
      return { applied: false, sessionStatus: session.status };
    }

    if (status === 'failed') {
      const res = await this.prisma.selfOrderSession.updateMany({
        where: { id: session.id, paymentRef, status: 'submitted' },
        data: { paymentStatus: 'failed' },
      });
      return { applied: res.count === 1, sessionStatus: session.status };
    }

    return { applied: false, sessionStatus: session.status };
  }

  /** Payment status for the customer page (no internal payment reference). */
  async getPaymentStatus(sessionCode: string) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode },
      select: {
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentAt: true,
        updatedAt: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      sessionStatus: session.status,
      isPaid: session.status === 'paid',
      paymentMethod: session.paymentMethod,
      paymentStatus: session.paymentStatus,
      paymentCreatedAt: session.paymentAt,
      lastUpdated: session.updatedAt,
    };
  }
}
