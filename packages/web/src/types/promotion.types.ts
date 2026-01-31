export type DiscountType = 'percentage' | 'fixed' | 'bogo';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  businessId: string;
  createdAt: string;
}

export interface CreatePromotionRequest {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
}

export interface Voucher {
  id: string;
  code: string;
  promotionId: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  amountPerPoint: number;
  redemptionRate: number;
  pointExpiryDays: number | null;
  isActive: boolean;
  businessId: string;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  benefits: string | null;
  sortOrder: number;
}

// Voucher Generation
export interface GenerateVoucherRequest {
  prefix: string;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
}

export interface GeneratedVoucher {
  id: string;
  code: string;
  prefix: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

// Loyalty Analytics
export interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  redemptionRate: number;
  topCustomers: LoyaltyTopCustomer[];
  tierDistribution: LoyaltyTierDistribution[];
  recentActivity: LoyaltyActivityItem[];
}

export interface LoyaltyTopCustomer {
  id: string;
  name: string;
  phone: string | null;
  totalPoints: number;
  currentPoints: number;
  tierName: string | null;
}

export interface LoyaltyTierDistribution {
  tierName: string;
  memberCount: number;
  color: string;
}

export interface LoyaltyActivityItem {
  id: string;
  customerName: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  occurredAt: string;
}
