import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHash } from 'crypto';
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

@Injectable()
export class MidtransGateway implements IPaymentGateway {
  private readonly logger = new Logger(MidtransGateway.name);
  private readonly serverKey: string;
  private readonly baseUrl: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY', '');
    this.isProduction = this.configService.get<string>('MIDTRANS_ENV', 'sandbox') === 'production';
    this.baseUrl = this.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
  }

  async processPayment(input: PaymentInput): Promise<PaymentResult> {
    try {
      const chargePayload = this.buildChargePayload(input);

      this.logger.log(`Processing Midtrans payment: ${input.method} - ${input.referenceNumber}`);

      const response = await axios.post<MidtransChargeResponse>(
        `${this.baseUrl}/charge`,
        chargePayload,
        {
          headers: {
            Authorization: this.generateAuthHeader(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 30000,
        },
      );

      return this.mapChargeResponse(response.data);
    } catch (error) {
      this.logger.error('Midtrans payment failed', this.extractError(error));
      return {
        success: false,
        transactionRef: '',
        message: this.extractErrorMessage(error),
      };
    }
  }

  async refundPayment(transactionRef: string, amount: number, reason?: string): Promise<RefundResult> {
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
            'Accept': 'application/json',
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

  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
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

      return this.mapPaymentStatus(response.data.transaction_status);
    } catch {
      return 'pending';
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
      if (!this.verifyWebhookSignature(orderId, statusCode, grossAmount, signatureKey)) {
        this.logger.warn(`Invalid webhook signature for order ${orderId}`);
        return {
          success: false,
          transactionStatus: 'failed',
          transactionId: '',
          orderId,
        };
      }

      const transactionStatus = this.mapPaymentStatus(payload.transaction_status as string);

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
        orderId: payload.order_id as string || '',
      };
    }
  }

  private buildChargePayload(input: PaymentInput): Record<string, unknown> {
    const paymentType = this.mapPaymentMethod(input.method);
    const basePayload = {
      payment_type: paymentType,
      transaction_details: {
        order_id: input.referenceNumber || `TXN-${Date.now()}`,
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

      case 'credit_card':
        return {
          ...basePayload,
          credit_card: {
            secure: true,
            channel_id: this.getConfigValue('MIDTRANS_CARD_CHANNEL_ID'),
            callback_url: input.metadata?.callbackUrl as string,
          },
        };

      case 'bank_transfer':
        return {
          ...basePayload,
          bank_transfer: {
            va_info: this.getVaInfo(input.metadata?.bank as string),
          },
        };

      default:
        return basePayload;
    }
  }

  private extractCustomerDetails(metadata?: Record<string, unknown>): {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | Record<string, never> {
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

  private getVaInfo(bank?: string): Array<{ bank: string; va_number: string }> {
    // Get VA numbers from Midtrans API or use configured ones
    const vaNumbers: Array<{ bank: string; va_number: string }> = [];

    if (bank) {
      vaNumbers.push({
        bank,
        va_number: this.getVaNumberForBank(bank),
      });
    }

    return vaNumbers;
  }

  private getVaNumberForBank(bank: string): string {
    // In production, you would fetch this from Midtrans API
    // For now, return a placeholder
    return `VA-${bank.toUpperCase()}-${Date.now()}`;
  }

  private mapChargeResponse(data: MidtransChargeResponse): PaymentResult {
    const success = data.status_code === '201' || data.status_code === '200';

    const result: PaymentResult & Record<string, unknown> = {
      success,
      transactionRef: data.transaction_id || data.order_id || '',
      message: data.status_message,
    };

    // Add payment-specific response data
    if (data.redirect_url) {
      result.redirectUrl = data.redirect_url;
    }

    if (data.actions?.[0]?.url) {
      result.actionUrl = data.actions[0].url;
    }

    if (data.qr_code) {
      result.qrCode = data.qr_code;
    }

    if (data.va_numbers?.[0]) {
      result.vaNumber = data.va_numbers[0].va_number;
      result.bank = data.va_numbers[0].bank;
    }

    if (data.bill_key) {
      result.billKey = data.bill_key;
    }

    if (data.expiry_time) {
      result.expiryTime = data.expiry_time;
    }

    return result;
  }

  private mapPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      midtrans_qris: 'qris',
      midtrans_gopay: 'gopay',
      midtrans_ovo: 'ovo',
      midtrans_dana: 'dana',
      midtrans_shopeepay: 'shopeepay',
      qris: 'qris',
      gopay: 'gopay',
      ovo: 'ovo',
      dana: 'dana',
      shopeepay: 'shopeepay',
      bank_transfer: 'bank_transfer',
      card: 'credit_card',
      credit_card: 'credit_card',
    };

    return methodMap[method] || 'bank_transfer';
  }

  private mapPaymentStatus(status?: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      capture: 'completed',
      settlement: 'completed',
      authorize: 'pending',
      pending: 'pending',
      deny: 'failed',
      cancel: 'failed',
      expire: 'failed',
      refund: 'refunded',
      partial_refund: 'refunded',
    };

    return statusMap[status || ''] || 'pending';
  }

  private generateAuthHeader(): string {
    const authString = Buffer.from(`${this.serverKey}:`).toString('base64');
    return `Basic ${authString}`;
  }

  private verifyWebhookSignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
    const hash = createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${this.serverKey}`)
      .digest('hex');
    return hash === signatureKey;
  }

  private getConfigValue(key: string): string {
    return this.configService.get<string>(key, '');
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
