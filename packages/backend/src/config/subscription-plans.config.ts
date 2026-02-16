export interface SubscriptionPlanConfig {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  trialDays: number;
  restrictedFeatures: string[];
}

export const SUBSCRIPTION_PLANS: Record<'free' | 'premium', SubscriptionPlanConfig> = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Fitur dasar POS untuk memulai bisnis',
    trialDays: 0,
    restrictedFeatures: [
      'multi_outlet',
      'reports_advanced',
      'online_store',
      'api_integration',
      'customer_loyalty',
      'promotions',
      'vouchers',
      'customer_segments',
      'self_order_qr',
      'audit_log',
      'excel_import',
      'multi_warehouse',
    ],
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 149000,
    yearlyPrice: 1190000,
    description: 'Semua fitur untuk mengembangkan bisnis',
    trialDays: 14,
    restrictedFeatures: [],
  },
};

export function getPlanConfig(plan: 'free' | 'premium'): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS[plan];
}

export function isFeatureRestrictedByPlan(plan: 'free' | 'premium', featureKey: string): boolean {
  return SUBSCRIPTION_PLANS[plan].restrictedFeatures.includes(featureKey);
}
