export interface SubscriptionInfoDto {
  plan: 'free' | 'premium';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  billingCycle: string | null;
  startDate: string | null;
  endDate: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  isTrialActive: boolean;
  daysRemaining: number | null;
  planConfig: {
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    description: string;
    restrictedFeatures: string[];
  };
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  provider: string | null;
  createdAt: string;
}

export interface UpgradeResultDto {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentUrl: string | null;
  provider: string;
  expiresAt: string;
}
