import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { Promotion } from '@prisma/client';

export interface TransactionItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
}

export interface ApplicablePromotion {
  id: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed' | 'bogo';
  discountValue: number;
  calculatedDiscount: number;
}

export interface PromotionRuleContext {
  businessId: string;
  outletId?: string;
  items: TransactionItem[];
  total: number;
  customerId?: string;
  now?: Date;
}

export interface PromotionResult {
  applicablePromotions: ApplicablePromotion[];
  bestPromotion?: ApplicablePromotion;
  totalDiscount: number;
  finalTotal: number;
}

@Injectable()
export class PromotionRulesEngine {
  constructor(private readonly prisma: PrismaService) {}

  async findApplicablePromotions(context: PromotionRuleContext): Promise<PromotionResult> {
    const now = context.now ?? new Date();

    const promotions = await this.prisma.promotion.findMany({
      where: {
        businessId: context.businessId,
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
        OR: [
          { usageLimit: null },
          { usedCount: { lt: this.prisma.promotion.fields.usageLimit } },
        ],
      },
    });

    const applicable: ApplicablePromotion[] = [];

    for (const promotion of promotions) {
      const result = this.evaluatePromotion(promotion, context);
      if (result) {
        applicable.push(result);
      }
    }

    // Sort by discount amount (highest first)
    applicable.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount);

    const bestPromotion = applicable[0];
    const totalDiscount = bestPromotion?.calculatedDiscount ?? 0;

    return {
      applicablePromotions: applicable,
      bestPromotion,
      totalDiscount,
      finalTotal: Math.max(0, context.total - totalDiscount),
    };
  }

  private evaluatePromotion(promotion: Promotion, context: PromotionRuleContext): ApplicablePromotion | null {
    const discountValue = promotion.discountValue.toNumber();
    const minPurchase = promotion.minPurchase?.toNumber();
    const maxDiscount = promotion.maxDiscount?.toNumber();
    const applicableTo = promotion.applicableTo as Record<string, unknown>;

    // Check minimum purchase
    if (minPurchase && context.total < minPurchase) {
      return null;
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      return null;
    }

    // Check applicable filters
    if (!this.passesApplicableFilters(applicableTo, context)) {
      return null;
    }

    let calculatedDiscount = 0;

    switch (promotion.discountType) {
      case 'percentage':
        calculatedDiscount = (context.total * discountValue) / 100;
        if (maxDiscount) {
          calculatedDiscount = Math.min(calculatedDiscount, maxDiscount);
        }
        break;

      case 'fixed':
        calculatedDiscount = Math.min(discountValue, context.total);
        break;

      case 'bogo':
        calculatedDiscount = this.calculateBogoDiscount(discountValue, context, applicableTo);
        break;
    }

    if (calculatedDiscount <= 0) {
      return null;
    }

    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue,
      calculatedDiscount: Math.floor(calculatedDiscount),
    };
  }

  private passesApplicableFilters(applicableTo: Record<string, unknown>, context: PromotionRuleContext): boolean {
    if (!applicableTo || Object.keys(applicableTo).length === 0) {
      return true;
    }

    // Check outlet filter
    const outlets = applicableTo.outlets as string[] | undefined;
    if (outlets && outlets.length > 0 && context.outletId) {
      if (!outlets.includes(context.outletId)) {
        return false;
      }
    }

    // Check customer filter
    const customerSegments = applicableTo.customerSegments as string[] | undefined;
    if (customerSegments && customerSegments.length > 0) {
      // TODO: Implement customer segment checking
    }

    // Check product filter
    const productIds = applicableTo.productIds as string[] | undefined;
    const categoryIds = applicableTo.categoryIds as string[] | undefined;

    if ((productIds && productIds.length > 0) || (categoryIds && categoryIds.length > 0)) {
      const hasMatchingItems = context.items.some((item: TransactionItem) => {
        if (productIds && productIds.includes(item.productId)) {
          return true;
        }
        // TODO: Check category IDs
        return false;
      });

      if (!hasMatchingItems) {
        return false;
      }
    }

    return true;
  }

  private calculateBogoDiscount(
    discountValue: number,
    context: PromotionRuleContext,
    applicableTo: Record<string, unknown>,
  ): number {
    // BOGO: Buy X Get Y discount (e.g., buy 1 get 1 50% off)
    const productIds = applicableTo.productIds as string[] | undefined;

    let applicableItems = context.items;
    if (productIds && productIds.length > 0) {
      applicableItems = context.items.filter((item: TransactionItem) => productIds.includes(item.productId));
    }

    if (applicableItems.length === 0) {
      return 0;
    }

    // For simplicity, give discount on cheapest item
    const cheapestPrice = Math.min(...applicableItems.map((item: TransactionItem) => item.price));
    return cheapestPrice * (discountValue / 100);
  }

  async incrementUsageCount(promotionId: string): Promise<void> {
    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { usedCount: { increment: 1 } },
    });
  }
}
