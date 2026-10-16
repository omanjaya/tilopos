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

/** Promotion scope (ids must belong to the business). */
export interface PromotionApplicableTo {
  outlets?: string[];
  productIds?: string[];
  categoryIds?: string[];
  customerSegments?: string[];
}

/** validFrom / validUntil are full ISO timestamps (business day start/end, Asia/Jakarta). */
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
  applicableTo?: PromotionApplicableTo;
}

/** PUT /promotions/:id — only editable fields; `null` clears an optional field. */
export interface UpdatePromotionRequest {
  name?: string;
  description?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number | null;
  applicableTo?: PromotionApplicableTo;
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

/** Shape of GET /settings/loyalty/tiers rows (Decimals converted by the backend). */
export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  minSpent: number;
  pointMultiplier: number;
  /** JSON column: list of benefit strings or a legacy object like { discount: 10 }. */
  benefits: string[] | Record<string, unknown> | string | null;
  sortOrder: number;
  isActive: boolean;
}

// Voucher Generation
export interface GenerateVoucherRequest {
  prefix: string;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validTo: string;
  /** Stored on the shared parent promotion; each voucher code is single-use. */
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
