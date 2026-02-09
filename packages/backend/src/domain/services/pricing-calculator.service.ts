import { Injectable } from '@nestjs/common';
import { PricingRule, CartContext, DiscountType } from '../entities/pricing-rule.entity';
import { Money } from '../value-objects/money';

export interface PricingContext {
  productId: string;
  categoryId?: string;
  quantity: number;
  originalPrice: Money;
  customerSegment?: string;
  currentTime: Date;
  stockLevel?: number;
  cartTotal?: number;
  cartItemCount?: number;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: Money;
}

export interface PricingResult {
  originalPrice: Money;
  finalPrice: Money;
  totalDiscount: Money;
  appliedRules: AppliedRule[];
  savingsPercentage: number;
}

@Injectable()
export class PricingCalculatorService {
  /**
   * Calculate final price for a product considering all applicable pricing rules
   * Rules are applied in priority order (highest first)
   * Non-combinable rules stop further rule application
   */
  calculatePrice(context: PricingContext, rules: PricingRule[]): PricingResult {
    // Filter and sort rules by priority (highest first)
    const eligibleRules = this.getEligibleRules(context, rules);

    if (eligibleRules.length === 0) {
      return this.createNoDiscountResult(context.originalPrice);
    }

    // Apply rules in order
    let currentPrice = context.originalPrice;
    const appliedRules: AppliedRule[] = [];
    let ruleApplicationCount = 0;

    for (const rule of eligibleRules) {
      // Check max applications per transaction
      if (
        rule.maxApplicationsPerTransaction !== null &&
        ruleApplicationCount >= rule.maxApplicationsPerTransaction
      ) {
        break;
      }

      // Calculate discount for this rule
      const discountAmount = rule.calculateDiscount(currentPrice);

      // Ensure price doesn't go below zero
      const finalNewPrice =
        discountAmount.amount >= currentPrice.amount
          ? Money.zero(currentPrice.currency)
          : currentPrice.subtract(discountAmount);

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        discountAmount,
      });

      currentPrice = finalNewPrice;
      ruleApplicationCount++;

      // Stop if rule is not combinable
      if (!rule.isCombinable) {
        break;
      }
    }

    const totalDiscount = context.originalPrice.subtract(currentPrice);
    const savingsPercentage =
      context.originalPrice.amount > 0
        ? (totalDiscount.amount / context.originalPrice.amount) * 100
        : 0;

    return {
      originalPrice: context.originalPrice,
      finalPrice: currentPrice,
      totalDiscount,
      appliedRules,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100, // Round to 2 decimals
    };
  }

  /**
   * Calculate prices for multiple products in batch
   */
  calculateBatchPrices(
    contexts: PricingContext[],
    rules: PricingRule[],
  ): Map<string, PricingResult> {
    const results = new Map<string, PricingResult>();

    for (const context of contexts) {
      const result = this.calculatePrice(context, rules);
      results.set(context.productId, result);
    }

    return results;
  }

  /**
   * Get all eligible rules for a given context, sorted by priority
   */
  private getEligibleRules(context: PricingContext, rules: PricingRule[]): PricingRule[] {
    const cartContext: CartContext = {
      productId: context.productId,
      categoryId: context.categoryId,
      quantity: context.quantity,
      customerSegment: context.customerSegment,
      currentTime: context.currentTime,
      stockLevel: context.stockLevel,
      cartTotal: context.cartTotal,
      cartItemCount: context.cartItemCount,
    };

    return rules
      .filter((rule) => {
        const evaluation = rule.evaluateEligibility(cartContext);
        return evaluation.isEligible;
      })
      .sort((a, b) => b.priority - a.priority); // Highest priority first
  }

  /**
   * Create result with no discount applied
   */
  private createNoDiscountResult(originalPrice: Money): PricingResult {
    return {
      originalPrice,
      finalPrice: originalPrice,
      totalDiscount: Money.zero(originalPrice.currency),
      appliedRules: [],
      savingsPercentage: 0,
    };
  }

  /**
   * Preview what rules would apply without actually calculating final price
   */
  previewApplicableRules(context: PricingContext, rules: PricingRule[]): PricingRule[] {
    return this.getEligibleRules(context, rules);
  }

  /**
   * Calculate potential savings if customer adds more items to meet rule criteria
   */
  calculatePotentialSavings(
    context: PricingContext,
    rules: PricingRule[],
  ): { rule: PricingRule; requiredQuantity: number; potentialSaving: Money }[] {
    const potentialSavings: { rule: PricingRule; requiredQuantity: number; potentialSaving: Money }[] = [];

    for (const rule of rules) {
      // Check if rule has minimum quantity requirement
      if (rule.minQuantity && context.quantity < rule.minQuantity) {
        // Check if adding more items would make rule eligible
        const testContext = {
          ...context,
          quantity: rule.minQuantity,
        };

        const cartContext: CartContext = {
          productId: testContext.productId,
          categoryId: testContext.categoryId,
          quantity: testContext.quantity,
          customerSegment: testContext.customerSegment,
          currentTime: testContext.currentTime,
          stockLevel: testContext.stockLevel,
          cartTotal: testContext.cartTotal,
          cartItemCount: testContext.cartItemCount,
        };

        const evaluation = rule.evaluateEligibility(cartContext);
        if (evaluation.isEligible) {
          const discount = rule.calculateDiscount(context.originalPrice);
          potentialSavings.push({
            rule,
            requiredQuantity: rule.minQuantity - context.quantity,
            potentialSaving: discount,
          });
        }
      }
    }

    return potentialSavings.sort((a, b) => b.potentialSaving.amount - a.potentialSaving.amount);
  }
}
