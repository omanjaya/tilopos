import { PricingRule } from '../../domain/entities/pricing-rule.entity';

export interface FindPricingRulesOptions {
  businessId: string;
  productIds?: string[];
  categoryIds?: string[];
  type?: string;
  status?: string;
  activeAt?: Date;
}

export interface IPricingRuleRepository {
  /**
   * Find a pricing rule by ID
   */
  findById(id: string, businessId: string): Promise<PricingRule | null>;

  /**
   * Find all pricing rules matching the criteria
   */
  findAll(options: FindPricingRulesOptions): Promise<PricingRule[]>;

  /**
   * Find active pricing rules for a specific product
   */
  findActiveForProduct(
    businessId: string,
    productId: string,
    categoryId?: string,
  ): Promise<PricingRule[]>;

  /**
   * Create a new pricing rule
   */
  create(rule: PricingRule): Promise<PricingRule>;

  /**
   * Update an existing pricing rule
   */
  update(id: string, businessId: string, rule: Partial<PricingRule>): Promise<PricingRule>;

  /**
   * Delete a pricing rule
   */
  delete(id: string, businessId: string): Promise<void>;

  /**
   * Update rule status
   */
  updateStatus(id: string, businessId: string, status: string): Promise<void>;
}
