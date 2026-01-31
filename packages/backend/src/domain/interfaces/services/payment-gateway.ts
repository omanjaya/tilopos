export interface IPaymentGateway {
  processPayment(input: PaymentInput): Promise<PaymentResult>;
  refundPayment(transactionRef: string, amount: number, reason?: string): Promise<RefundResult>;
  checkStatus(transactionRef: string): Promise<PaymentStatus>;
}

export interface PaymentInput {
  method: string;
  amount: number;
  referenceNumber?: string;
  metadata?: Record<string, unknown>;
  description?: string;
  expirySeconds?: number;
  paymentMethods?: string[];
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionRef: string;
  message?: string;
  paymentData?: Record<string, unknown>;
}

export interface RefundResult {
  success: boolean;
  refundRef: string;
  message?: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
