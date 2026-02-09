import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import { Money } from '../value-objects/money';

export enum PricingRuleType {
  TIME_BASED = 'time_based',
  QUANTITY_BASED = 'quantity_based',
  CUSTOMER_SEGMENT = 'customer_segment',
  INVENTORY_BASED = 'inventory_based',
  BUNDLE = 'bundle',
  DYNAMIC_SURGE = 'dynamic_surge',
}

export enum PricingRuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export interface PricingConditions {
  minPurchaseAmount?: number;
  maxPurchaseAmount?: number;
  minCartItems?: number;
  stockThreshold?: number;
  demandMultiplier?: number;
}

export interface CartContext {
  productId: string;
  categoryId?: string;
  quantity: number;
  customerSegment?: string;
  currentTime: Date;
  stockLevel?: number;
  cartTotal?: number;
  cartItemCount?: number;
}

export interface EvaluationResult {
  isEligible: boolean;
  reason?: string;
}

export class PricingRule {
  constructor(
    public readonly id: string,
    public readonly businessId: string,
    public readonly name: string,
    public readonly type: PricingRuleType,
    public readonly priority: number,
    public readonly status: PricingRuleStatus,
    public readonly validFrom: Date,
    public readonly validUntil: Date | null,
    public readonly conditions: PricingConditions,
    public readonly discountType: DiscountType,
    public readonly discountValue: number,
    public readonly minQuantity: number | null,
    public readonly maxQuantity: number | null,
    public readonly applicableDays: number[],
    public readonly timeFrom: string | null,
    public readonly timeUntil: string | null,
    public readonly customerSegments: string[],
    public readonly productIds: string[],
    public readonly categoryIds: string[],
    public readonly excludeProductIds: string[],
    public readonly isCombinable: boolean,
    public readonly maxApplicationsPerTransaction: number | null,
    public readonly description?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.priority < 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Priority must be a non-negative number',
      );
    }

    if (this.discountValue < 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Discount value cannot be negative',
      );
    }

    if (this.discountType === DiscountType.PERCENTAGE && this.discountValue > 100) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Percentage discount cannot exceed 100%',
      );
    }

    if (this.minQuantity !== null && this.minQuantity < 1) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Minimum quantity must be at least 1',
      );
    }

    if (
      this.minQuantity !== null &&
      this.maxQuantity !== null &&
      this.minQuantity > this.maxQuantity
    ) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Minimum quantity cannot exceed maximum quantity',
      );
    }

    if (this.validUntil && this.validFrom >= this.validUntil) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Valid from date must be before valid until date',
      );
    }
  }

  /**
   * Evaluate if this pricing rule is eligible for the given cart context
   */
  evaluateEligibility(context: CartContext): EvaluationResult {
    // Check if rule is active
    if (this.status !== PricingRuleStatus.ACTIVE) {
      return { isEligible: false, reason: 'Rule is not active' };
    }

    // Check date validity
    if (!this.isApplicableAt(context.currentTime)) {
      return { isEligible: false, reason: 'Rule is not valid at this time' };
    }

    // Check if product/category applies
    if (!this.appliesTo(context.productId, context.categoryId)) {
      return { isEligible: false, reason: 'Product not applicable' };
    }

    // Check quantity constraints
    if (
      this.minQuantity !== null &&
      context.quantity < this.minQuantity
    ) {
      return {
        isEligible: false,
        reason: `Minimum quantity required: ${this.minQuantity}`,
      };
    }

    if (
      this.maxQuantity !== null &&
      context.quantity > this.maxQuantity
    ) {
      return {
        isEligible: false,
        reason: `Maximum quantity exceeded: ${this.maxQuantity}`,
      };
    }

    // Check customer segment
    if (
      this.customerSegments.length > 0 &&
      (!context.customerSegment ||
        !this.customerSegments.includes(context.customerSegment))
    ) {
      return { isEligible: false, reason: 'Customer segment not applicable' };
    }

    // Check cart total conditions
    if (this.conditions.minPurchaseAmount) {
      if (!context.cartTotal || context.cartTotal < this.conditions.minPurchaseAmount) {
        return {
          isEligible: false,
          reason: `Minimum purchase amount required: ${this.conditions.minPurchaseAmount}`,
        };
      }
    }

    if (this.conditions.maxPurchaseAmount) {
      if (context.cartTotal && context.cartTotal > this.conditions.maxPurchaseAmount) {
        return {
          isEligible: false,
          reason: `Maximum purchase amount exceeded: ${this.conditions.maxPurchaseAmount}`,
        };
      }
    }

    // Check cart item count
    if (this.conditions.minCartItems) {
      if (!context.cartItemCount || context.cartItemCount < this.conditions.minCartItems) {
        return {
          isEligible: false,
          reason: `Minimum cart items required: ${this.conditions.minCartItems}`,
        };
      }
    }

    // Check inventory-based conditions
    if (this.type === PricingRuleType.INVENTORY_BASED && this.conditions.stockThreshold) {
      if (!context.stockLevel || context.stockLevel > this.conditions.stockThreshold) {
        return {
          isEligible: false,
          reason: 'Stock level above threshold',
        };
      }
    }

    return { isEligible: true };
  }

  /**
   * Check if rule is applicable at a given date/time
   */
  isApplicableAt(date: Date): boolean {
    // Check date range
    if (date < this.validFrom) {
      return false;
    }

    if (this.validUntil && date > this.validUntil) {
      return false;
    }

    // Check day of week
    if (this.applicableDays.length > 0) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      if (!this.applicableDays.includes(dayOfWeek)) {
        return false;
      }
    }

    // Check time range
    if (this.timeFrom || this.timeUntil) {
      const currentTime = date.toTimeString().substring(0, 5); // HH:MM format

      if (this.timeFrom && currentTime < this.timeFrom) {
        return false;
      }

      if (this.timeUntil && currentTime > this.timeUntil) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if rule applies to a specific product or category
   */
  appliesTo(productId: string, categoryId?: string): boolean {
    // Check exclusions first
    if (this.excludeProductIds.includes(productId)) {
      return false;
    }

    // If no specific products or categories defined, applies to all
    if (this.productIds.length === 0 && this.categoryIds.length === 0) {
      return true;
    }

    // Check if product is explicitly included
    if (this.productIds.length > 0 && this.productIds.includes(productId)) {
      return true;
    }

    // Check if category is included
    if (this.categoryIds.length > 0 && categoryId && this.categoryIds.includes(categoryId)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate discount amount for a given original price
   */
  calculateDiscount(originalPrice: Money): Money {
    if (this.discountType === DiscountType.PERCENTAGE) {
      const discountAmount = (originalPrice.amount * this.discountValue) / 100;
      return Money.create(Math.round(discountAmount), originalPrice.currency);
    } else {
      // Fixed amount discount
      return Money.create(this.discountValue, originalPrice.currency);
    }
  }

  /**
   * Calculate final price after applying this rule
   */
  applyDiscount(originalPrice: Money): Money {
    const discount = this.calculateDiscount(originalPrice);

    // Ensure price doesn't go below zero
    if (discount.amount >= originalPrice.amount) {
      return Money.zero(originalPrice.currency);
    }

    return originalPrice.subtract(discount);
  }
}
