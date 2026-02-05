export interface PromotionRecord {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number | null;
  usedCount: number;
  applicableTo: unknown;
  isActive: boolean;
  createdAt: Date;
}

export interface VoucherRecord {
  id: string;
  businessId: string;
  code: string;
  promotionId: string | null;
  initialValue: number | null;
  remainingValue: number | null;
  expiresAt: Date | null;
  usedAt: Date | null;
  usedBy: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface IPromotionRepository {
  findByBusinessId(businessId: string): Promise<PromotionRecord[]>;
  findById(id: string): Promise<PromotionRecord | null>;
  save(data: CreatePromotionData): Promise<PromotionRecord>;
  update(id: string, data: Record<string, unknown>): Promise<PromotionRecord>;
  deactivate(id: string): Promise<void>;
  findVoucherByCode(code: string): Promise<VoucherRecord | null>;
}

export interface CreatePromotionData {
  businessId: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number | null;
  applicableTo?: Record<string, unknown>;
}
