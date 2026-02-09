import { apiClient } from '../client';

export interface CalculatePriceRequest {
  productId: string;
  categoryId?: string;
  quantity: number;
  originalPrice: number;
  customerSegment?: string;
  stockLevel?: number;
  cartTotal?: number;
  cartItemCount?: number;
}

export interface BatchPriceItem {
  productId: string;
  categoryId?: string;
  quantity: number;
  originalPrice: number;
}

export interface CalculateBatchPriceRequest {
  items: BatchPriceItem[];
  customerSegment?: string;
  cartTotal?: number;
  cartItemCount?: number;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  discountAmount: number;
}

export interface PricingResult {
  originalPrice: number;
  finalPrice: number;
  totalDiscount: number;
  savingsPercentage: number;
  appliedRules: AppliedRule[];
}

export interface BatchPricingResult extends PricingResult {
  productId: string;
}

export interface PricingRule {
  id: string;
  name: string;
  type: string;
  priority: number;
  discountType: string;
  discountValue: number;
  description?: string;
}

export interface PotentialSaving {
  ruleId: string;
  ruleName: string;
  requiredQuantity: number;
  potentialSaving: number;
}

export const pricingApi = {
  /**
   * Calculate dynamic price for a single product
   */
  calculatePrice: (data: CalculatePriceRequest) =>
    apiClient
      .post<{ success: boolean; data: PricingResult }>('/pricing/calculate', data)
      .then((res) => res.data.data),

  /**
   * Calculate dynamic prices for multiple products in batch
   */
  calculateBatchPrice: (data: CalculateBatchPriceRequest) =>
    apiClient
      .post<{ success: boolean; data: BatchPricingResult[] }>('/pricing/calculate-batch', data)
      .then((res) => res.data.data),

  /**
   * Preview applicable pricing rules without calculating price
   */
  previewRules: (data: CalculatePriceRequest) =>
    apiClient
      .post<{ success: boolean; data: PricingRule[] }>('/pricing/preview-rules', data)
      .then((res) => res.data.data),

  /**
   * Get potential savings if customer adds more items
   */
  getPotentialSavings: (data: CalculatePriceRequest) =>
    apiClient
      .post<{ success: boolean; data: PotentialSaving[] }>('/pricing/potential-savings', data)
      .then((res) => res.data.data),
};
