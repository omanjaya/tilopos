import { Inject, Injectable } from '@nestjs/common';
import { IPricingRuleRepository } from '../../repositories/pricing-rule.repository';
import {
  PricingCalculatorService,
  PricingContext,
  PricingResult,
} from '../../../domain/services/pricing-calculator.service';
import { Money } from '../../../domain/value-objects/money';

export interface CalculatePriceInput {
  businessId: string;
  productId: string;
  categoryId?: string;
  quantity: number;
  originalPrice: number;
  customerSegment?: string;
  stockLevel?: number;
  cartTotal?: number;
  cartItemCount?: number;
}

export interface CalculateBatchPriceInput {
  businessId: string;
  items: {
    productId: string;
    categoryId?: string;
    quantity: number;
    originalPrice: number;
  }[];
  customerSegment?: string;
  cartTotal?: number;
  cartItemCount?: number;
}

@Injectable()
export class CalculateDynamicPriceUseCase {
  constructor(
    @Inject('IPricingRuleRepository')
    private readonly pricingRuleRepository: IPricingRuleRepository,
    private readonly pricingCalculator: PricingCalculatorService,
  ) {}

  /**
   * Calculate dynamic price for a single product
   */
  async execute(input: CalculatePriceInput): Promise<PricingResult> {
    // Fetch active pricing rules for this product
    const rules = await this.pricingRuleRepository.findActiveForProduct(
      input.businessId,
      input.productId,
      input.categoryId,
    );

    // Create pricing context
    const context: PricingContext = {
      productId: input.productId,
      categoryId: input.categoryId,
      quantity: input.quantity,
      originalPrice: Money.create(input.originalPrice),
      customerSegment: input.customerSegment,
      currentTime: new Date(),
      stockLevel: input.stockLevel,
      cartTotal: input.cartTotal,
      cartItemCount: input.cartItemCount,
    };

    // Calculate price using pricing calculator service
    return this.pricingCalculator.calculatePrice(context, rules);
  }

  /**
   * Calculate dynamic prices for multiple products in batch
   */
  async executeBatch(input: CalculateBatchPriceInput): Promise<Map<string, PricingResult>> {
    // Get all unique product and category IDs
    const productIds = input.items.map((item) => item.productId);
    const categoryIds = input.items
      .filter((item) => item.categoryId)
      .map((item) => item.categoryId!);

    // Fetch all relevant pricing rules in one query
    const rules = await this.pricingRuleRepository.findAll({
      businessId: input.businessId,
      productIds,
      categoryIds,
      status: 'active',
      activeAt: new Date(),
    });

    // Create contexts for each item
    const contexts: PricingContext[] = input.items.map((item) => ({
      productId: item.productId,
      categoryId: item.categoryId,
      quantity: item.quantity,
      originalPrice: Money.create(item.originalPrice),
      customerSegment: input.customerSegment,
      currentTime: new Date(),
      cartTotal: input.cartTotal,
      cartItemCount: input.cartItemCount,
    }));

    // Calculate prices in batch
    return this.pricingCalculator.calculateBatchPrices(contexts, rules);
  }

  /**
   * Preview applicable rules without calculating price
   */
  async previewRules(input: CalculatePriceInput) {
    const rules = await this.pricingRuleRepository.findActiveForProduct(
      input.businessId,
      input.productId,
      input.categoryId,
    );

    const context: PricingContext = {
      productId: input.productId,
      categoryId: input.categoryId,
      quantity: input.quantity,
      originalPrice: Money.create(input.originalPrice),
      customerSegment: input.customerSegment,
      currentTime: new Date(),
      stockLevel: input.stockLevel,
      cartTotal: input.cartTotal,
      cartItemCount: input.cartItemCount,
    };

    return this.pricingCalculator.previewApplicableRules(context, rules);
  }

  /**
   * Get potential savings if customer adds more items
   */
  async getPotentialSavings(input: CalculatePriceInput) {
    const rules = await this.pricingRuleRepository.findActiveForProduct(
      input.businessId,
      input.productId,
      input.categoryId,
    );

    const context: PricingContext = {
      productId: input.productId,
      categoryId: input.categoryId,
      quantity: input.quantity,
      originalPrice: Money.create(input.originalPrice),
      customerSegment: input.customerSegment,
      currentTime: new Date(),
      stockLevel: input.stockLevel,
      cartTotal: input.cartTotal,
      cartItemCount: input.cartItemCount,
    };

    return this.pricingCalculator.calculatePotentialSavings(context, rules);
  }
}
