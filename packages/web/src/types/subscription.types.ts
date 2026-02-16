export interface SubscriptionInfo {
  plan: 'free' | 'premium';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  billingCycle: string | null;
  startDate: string | null;
  endDate: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  isTrialActive: boolean;
  daysRemaining: number | null;
  planConfig: PlanConfig;
}

export interface PlanConfig {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  restrictedFeatures: string[];
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  provider: string | null;
  createdAt: string;
}

export interface UpgradeResult {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentUrl: string | null;
  provider: string;
  expiresAt: string;
}

export interface CreateUpgradeRequest {
  billingCycle: 'monthly' | 'yearly';
  provider?: 'midtrans' | 'xendit';
}

export interface CancelSubscriptionRequest {
  reason?: string;
}
