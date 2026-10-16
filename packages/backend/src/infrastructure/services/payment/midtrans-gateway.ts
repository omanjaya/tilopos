import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHash, timingSafeEqual } from 'crypto';
import type {
  IPaymentGateway,
  PaymentInput,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from '../../../domain/interfaces/services/payment-gateway';

interface MidtransChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  currency?: string;
  payment_type?: string;
  transaction_status?: string;
  fraud_status?: string;
  redirect_url?: string;
  actions?: Array<{ url: string; method?: string }>;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  qr_code?: string;
  bill_key?: string;
  bill_code?: string;
  expiry_time?: string;
}

interface MidtransStatusResponse {
  status_code: string;
  status_message: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
}

/** Banks for Midtrans Core API `bank_transfer` (VA number assigned by Midtrans). */
const MIDTRANS_VA_BANKS = ['bca', 'bni', 'bri', 'permata', 'cimb'];

@Injectable()
export class MidtransGateway implements IPaymentGateway {
  private readonly logger = new Logger(MidtransGateway.name);
  private readonly serverKey: string;
  private readonly baseUrl: string;
  private readonly isProduction: boolean;
  /** Why this gateway must not be used, or null when it is usable. */
  private readonly configError: string | null;

  constructor(private readonly configService: ConfigService) {
    this.serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') ?? '';
    const midtransEnv = this.configService.get<string>('MIDTRANS_ENV');
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    this.isProduction = midtransEnv === 'production';
    this.baseUrl = this.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    // A production deploy must say explicitly which Midtrans environment to use;
    // never silently talk to the sandbox (also enforced at boot by env.validation).
    if (!this.serverKey) {
      this.configError = 'MIDTRANS_SERVER_KEY not configured';
    } else if (nodeEnv === 'production' && midtransEnv !== 'production') {
      this.configError = 'MIDTRANS_ENV must be "production" when NODE_ENV=production';
    } else {
      this.configError = null;
    }
    if (this.configError) {
      this.logger.warn(`Midtrans gateway unavailable: ${this.configError}`);
    }
  }

  async processPayment(input: PaymentInput): Promise<PaymentResult> {
    if (this.configError) {
      return this.failure(this.configError);
    }
    if (!input.referenceNumber) {
      // order_id must be our persisted Payment/Invoice id so notifications can be matched.
      return this.failure('referenceNumber (payment id) is required as Midtrans order_id');
    }

    let chargePayload: Record<string, unknown>;
    try {
      chargePayload = this.buildChargePayload(input);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : String(error));
    }

    try {
      this.logger.log(`Processing Midtrans payment: ${input.method} - ${input.referenceNumber}`);

      const response = await axios.post<MidtransChargeResponse>(
        `${this.baseUrl}/charge`,
        chargePayload,
        {
          headers: {
            Authorization: this.generateAuthHeader(),
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30000,
        },
      );

      return this.mapChargeResponse(response.data);
    } catch (error) {
      this.logger.error('Midtrans payment failed', this.extractError(error));
      if (this.isOutcomeUnknown(error)) {
        // Timeout / 5xx: the charge may exist at Midtrans; the notification
        // (matched by order_id) settles it.
        return {
          success: false,
          transactionRef: '',
          message: `Payment gateway did not answer: ${this.extractErrorMessage(error)}`,
          paymentData: { paymentStatus: 'pending', outcomeUnknown: true },
        };
      }
      return this.failure(this.extractErrorMessage(error));
    }
  }

  async refundPayment(
    transactionRef: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    if (this.configError) {
      return { success: false, refundRef: '', message: this.configError };
    }
    try {
      this.logger.log(`Processing Midtrans refund: ${transactionRef} - ${amount}`);

      const response = await axios.post(
        `${this.baseUrl}/${transactionRef}/refund`,
        {
          amount,
          reason: reason || 'Customer refund',
        },
        {
          headers: {
            Authorization: this.generateAuthHeader(),
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30000,
        },
      );

      return {
        success: response.data.status_code === '200',
        refundRef: response.data.refund_key || transactionRef,
        message: response.data.status_message || 'Refund processed',
      };
    } catch (error) {
      this.logger.error('Midtrans refund failed', this.extractError(error));
      return {
        success: false,
        refundRef: '',
        message: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Throws when the status cannot be determined (not configured, auth error,
   * unknown order, network) instead of reporting 'pending'.
   */
  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
    if (this.configError) {
      throw new Error(this.configError);
    }
    try {
      const response = await axios.get<MidtransStatusResponse>(
        `${this.baseUrl}/${transactionRef}/status`,
        {
          headers: {
            Authorization: this.generateAuthHeader(),
          },
          timeout: 15000,
        },
      );
      return this.mapPaymentStatus(response.data.transaction_status, response.data.fraud_status);
    } catch (error) {
      this.logger.error(
        `Midtrans status check failed for ${transactionRef}`,
        this.extractError(error),
      );
      throw new Error(`Midtrans status check failed: ${this.extractErrorMessage(error)}`);
    }
  }

  /**
   * Handle webhook notification from Midtrans
   */
  async handleWebhook(payload: Record<string, unknown>): Promise<{
    success: boolean;
    transactionStatus: PaymentStatus;
    transactionId: string;
    orderId: string;
    fraudStatus?: string;
  }> {
    try {
      const statusCode = payload.status_code as string;
      const grossAmount = payload.gross_amount as string;
      const orderId = payload.order_id as string;
      const signatureKey = payload.signature_key as string;

      // Verify webhook signature
      if (
        !this.serverKey ||
        !this.verifyWebhookSignature(orderId, statusCode, grossAmount, signatureKey)
      ) {
        this.logger.warn(`Invalid webhook signature for order ${orderId}`);
        return {
          success: false,
          transactionStatus: 'failed',
          transactionId: '',
          orderId,
        };
      }

      const transactionStatus = this.mapPaymentStatus(
        payload.transaction_status as string,
        payload.fraud_status as string | undefined,
      );

      this.logger.log(`Webhook received for order ${orderId}: status=${transactionStatus}`);

      return {
        success: true,
        transactionStatus,
        transactionId: (payload.transaction_id as string) || '',
        orderId,
        fraudStatus: payload.fraud_status as string,
      };
    } catch (error) {
      this.logger.error('Webhook handling failed', error);
      return {
        success: false,
        transactionStatus: 'pending',
        transactionId: '',
        orderId: (payload.order_id as string) || '',
      };
    }
  }

  private buildChargePayload(input: PaymentInput): Record<string, unknown> {
    const paymentType = this.mapPaymentMethod(input.method);
    const basePayload = {
      payment_type: paymentType,
      transaction_details: {
        order_id: input.referenceNumber,
        gross_amount: input.amount,
      },
      customer_details: this.extractCustomerDetails(input.metadata),
    };

    // Add payment-specific parameters
    switch (paymentType) {
      case 'qris':
        return {
          ...basePayload,
          qris: {
            acquirer: this.getQrisAcquirer(input.metadata?.acquirer as string),
          },
        };

      case 'gopay':
        return {
          ...basePayload,
          gopay: {
            callback_url: input.metadata?.callbackUrl as string,
            expiry_period: this.getQrisExpiryPeriod(input.metadata?.expiryPeriod as number),
          },
        };

      case 'shopeepay':
        return {
          ...basePayload,
          shopeepay: {
            callback_url: input.metadata?.callbackUrl as string,
            expiry_period: this.getQrisExpiryPeriod(input.metadata?.expiryPeriod as number),
          },
        };

      case 'ovo':
        return {
          ...basePayload,
          ovo: {
            callback_url: input.metadata?.callbackUrl as string,
            expiry_period: this.getQrisExpiryPeriod(input.metadata?.expiryPeriod as number),
          },
        };

      case 'dana':
        return {
          ...basePayload,
          dana: {
            callback_url: input.metadata?.callbackUrl as string,
            expiry_period: this.getQrisExpiryPeriod(input.metadata?.expiryPeriod as number),
          },
        };

      case 'credit_card': {
        // Core API card charges need a token created client-side (Midtrans.js).
        const tokenId = input.metadata?.tokenId;
        if (typeof tokenId !== 'string' || !tokenId) {
          throw new Error('Card payments via Midtrans require a card token (metadata.tokenId)');
        }
        return {
          ...basePayload,
          credit_card: {
            token_id: tokenId,
            authentication: true,
          },
        };
      }

      case 'bank_transfer': {
        // Midtrans assigns the VA number; we only choose the bank.
        // NOTE: bank list per the public Core API docs; not verified against a sandbox.
        const bank = String(input.metadata?.bank ?? '').toLowerCase();
        if (!MIDTRANS_VA_BANKS.includes(bank)) {
          throw new Error(
            `bank_transfer via Midtrans requires metadata.bank (one of ${MIDTRANS_VA_BANKS.join(', ')})`,
          );
        }
        return { ...basePayload, bank_transfer: { bank } };
      }

      default:
        throw new Error(`Payment method "${input.method}" is not supported by Midtrans`);
    }
  }

  private extractCustomerDetails(metadata?: Record<string, unknown>):
    | {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
      }
    | Record<string, never> {
    if (!metadata?.customer) {
      return {};
    }

    const customer = metadata.customer as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };

    return {
      first_name: customer.firstName || 'Customer',
      last_name: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
    };
  }

  private getQrisAcquirer(acquirer?: string): string {
    const acquirerMap: Record<string, string> = {
      gopay: 'gopay',
      shopeepay: 'shopeepay',
    };
    return acquirerMap[acquirer || ''] || 'gopay';
  }

  private getQrisExpiryPeriod(minutes?: number): string {
    return `${minutes || 60}m`;
  }

  /**
   * `success` = Midtrans accepted the charge (201 = created/pending, 200 = done).
   * Whether it is PAID is in `paymentData.paymentStatus`, never implied by success.
   */
  private mapChargeResponse(data: MidtransChargeResponse): PaymentResult {
    const accepted = data.status_code === '201' || data.status_code === '200';
    const paymentStatus: PaymentStatus | 'failed' = accepted
      ? this.mapPaymentStatus(data.transaction_status, data.fraud_status)
      : 'failed';

    const paymentData: Record<string, unknown> = {
      paymentStatus: paymentStatus === 'refunded' ? 'completed' : paymentStatus,
      transactionStatus: data.transaction_status ?? null,
      paymentType: data.payment_type ?? null,
    };
    if (data.redirect_url) paymentData.redirectUrl = data.redirect_url;
    if (data.actions?.[0]?.url) paymentData.actionUrl = data.actions[0].url;
    if (data.qr_code) paymentData.qrCode = data.qr_code;
    if (data.va_numbers?.[0]) {
      paymentData.vaNumber = data.va_numbers[0].va_number;
      paymentData.bank = data.va_numbers[0].bank;
    }
    if (data.bill_key) paymentData.billKey = data.bill_key;
    if (data.expiry_time) paymentData.expiryTime = data.expiry_time;

    return {
      success: accepted && paymentStatus !== 'failed',
      transactionRef: data.transaction_id || data.order_id || '',
      message: data.status_message,
      paymentData,
    };
  }

  /** Unsupported methods are rejected, never silently mapped to bank transfer. */
  private mapPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      qris: 'qris',
      gopay: 'gopay',
      ovo: 'ovo',
      dana: 'dana',
      shopeepay: 'shopeepay',
      bank_transfer: 'bank_transfer',
      card: 'credit_card',
      credit_card: 'credit_card',
      debit_card: 'credit_card',
    };
    const mapped = methodMap[method];
    if (!mapped) {
      throw new Error(`Payment method "${method}" is not supported by Midtrans`);
    }
    return mapped;
  }

  /**
   * capture + fraud_status=challenge is held for review (pending), not paid.
   * partial_refund leaves the payment captured (only a full refund is 'refunded').
   */
  private mapPaymentStatus(status?: string, fraudStatus?: string): PaymentStatus {
    if (status === 'capture' && fraudStatus === 'challenge') return 'pending';
    if ((status === 'capture' || status === 'settlement') && fraudStatus === 'deny')
      return 'failed';
    const statusMap: Record<string, PaymentStatus> = {
      capture: 'completed',
      settlement: 'completed',
      authorize: 'pending',
      pending: 'pending',
      deny: 'failed',
      cancel: 'failed',
      expire: 'failed',
      failure: 'failed',
      refund: 'refunded',
      partial_refund: 'completed',
    };

    return statusMap[status || ''] || 'pending';
  }

  private failure(message: string): PaymentResult {
    return {
      success: false,
      transactionRef: '',
      message,
      paymentData: { paymentStatus: 'failed' },
    };
  }

  private isOutcomeUnknown(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return true;
    const status = error.response?.status;
    return status === undefined || status >= 500;
  }

  private generateAuthHeader(): string {
    const authString = Buffer.from(`${this.serverKey}:`).toString('base64');
    return `Basic ${authString}`;
  }

  private verifyWebhookSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string,
  ): boolean {
    const hash = Buffer.from(
      createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${this.serverKey}`)
        .digest('hex'),
    );
    const given = Buffer.from(String(signatureKey ?? ''));
    return given.length === hash.length && timingSafeEqual(given, hash);
  }

  private extractError(error: unknown): Record<string, unknown> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<MidtransChargeResponse>;
      return {
        message: axiosError.response?.data?.status_message || axiosError.message,
        statusCode: axiosError.response?.data?.status_code || axiosError.response?.status,
        data: axiosError.response?.data,
      };
    }
    return {
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  private extractErrorMessage(error: unknown): string {
    const extracted = this.extractError(error);
    return (extracted.message as string) || 'Payment processing failed';
  }
}
