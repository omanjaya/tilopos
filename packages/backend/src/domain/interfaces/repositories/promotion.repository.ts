export interface IPromotionRepository {
  findByBusinessId(businessId: string): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  save(data: CreatePromotionData): Promise<any>;
  update(id: string, data: Record<string, unknown>): Promise<any>;
  deactivate(id: string): Promise<void>;
  findVoucherByCode(code: string): Promise<any | null>;
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
