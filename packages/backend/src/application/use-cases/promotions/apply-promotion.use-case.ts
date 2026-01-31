import { Injectable } from '@nestjs/common';
import { PromotionRulesEngine } from '../../services/promotion-rules.engine';

export interface ApplyPromotionParams {
  businessId: string;
  outletId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  customerId?: string;
  promotionId?: string;
}

export interface ApplyPromotionResult {
  subtotal: number;
  discount: number;
  total: number;
  appliedPromotion?: {
    id: string;
    name: string;
    description: string | null;
    discountType: 'percentage' | 'fixed' | 'bogo';
    discountValue: number;
  };
  allApplicablePromotions: Array<{
    id: string;
    name: string;
    discountType: 'percentage' | 'fixed' | 'bogo';
    calculatedDiscount: number;
  }>;
}

@Injectable()
export class ApplyPromotionUseCase {
  constructor(private readonly promotionRules: PromotionRulesEngine) {}

  async execute(params: ApplyPromotionParams): Promise<ApplyPromotionResult> {
    const result = await this.promotionRules.findApplicablePromotions({
      businessId: params.businessId,
      outletId: params.outletId,
      items: params.items,
      total: params.total,
      customerId: params.customerId,
    });

    if (params.promotionId) {
      const selected = result.applicablePromotions.find((p) => p.id === params.promotionId);
      if (selected) {
        return {
          subtotal: params.total,
          discount: selected.calculatedDiscount,
          total: Math.max(0, params.total - selected.calculatedDiscount),
          appliedPromotion: {
            id: selected.id,
            name: selected.name,
            description: selected.description,
            discountType: selected.discountType,
            discountValue: selected.discountValue,
          },
          allApplicablePromotions: result.applicablePromotions.map((p) => ({
            id: p.id,
            name: p.name,
            discountType: p.discountType,
            calculatedDiscount: p.calculatedDiscount,
          })),
        };
      }
    }

    return {
      subtotal: params.total,
      discount: result.totalDiscount,
      total: result.finalTotal,
      ...(result.bestPromotion && {
        appliedPromotion: {
          id: result.bestPromotion.id,
          name: result.bestPromotion.name,
          description: result.bestPromotion.description,
          discountType: result.bestPromotion.discountType,
          discountValue: result.bestPromotion.discountValue,
        },
      }),
      allApplicablePromotions: result.applicablePromotions.map((p) => ({
        id: p.id,
        name: p.name,
        discountType: p.discountType,
        calculatedDiscount: p.calculatedDiscount,
      })),
    };
  }
}
