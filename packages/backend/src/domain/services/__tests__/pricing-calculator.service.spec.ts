import { Test, TestingModule } from '@nestjs/testing';
import { PricingCalculatorService, PricingContext } from '../pricing-calculator.service';
import {
  PricingRule,
  PricingRuleType,
  PricingRuleStatus,
  DiscountType,
} from '../../entities/pricing-rule.entity';
import { Money } from '../../value-objects/money';

describe('PricingCalculatorService', () => {
  let service: PricingCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingCalculatorService],
    }).compile();

    service = module.get<PricingCalculatorService>(PricingCalculatorService);
  });

  const validFrom = new Date('2026-01-01');
  const validUntil = new Date('2026-12-31');

  const createTestRule = (
    priority: number,
    discountValue: number,
    isCombinable = false,
  ): PricingRule => {
    return new PricingRule(
      `rule-${priority}`,
      'business-1',
      `Test Rule ${priority}`,
      PricingRuleType.TIME_BASED,
      priority,
      PricingRuleStatus.ACTIVE,
      validFrom,
      validUntil,
      {},
      DiscountType.PERCENTAGE,
      discountValue,
      null,
      null,
      [],
      null,
      null,
      [],
      ['product-1'],
      [],
      [],
      isCombinable,
      null,
    );
  };

  const createContext = (overrides = {}): PricingContext => ({
    productId: 'product-1',
    quantity: 1,
    originalPrice: Money.create(100000),
    currentTime: new Date('2026-06-15'),
    ...overrides,
  });

  describe('calculatePrice', () => {
    it('should return original price when no rules apply', () => {
      const context = createContext();
      const rules: PricingRule[] = [];

      const result = service.calculatePrice(context, rules);

      expect(result.finalPrice.amount).toBe(100000);
      expect(result.totalDiscount.amount).toBe(0);
      expect(result.appliedRules.length).toBe(0);
      expect(result.savingsPercentage).toBe(0);
    });

    it('should apply single rule correctly', () => {
      const context = createContext();
      const rules = [createTestRule(10, 20)]; // 20% discount

      const result = service.calculatePrice(context, rules);

      expect(result.originalPrice.amount).toBe(100000);
      expect(result.finalPrice.amount).toBe(80000);
      expect(result.totalDiscount.amount).toBe(20000);
      expect(result.appliedRules.length).toBe(1);
      expect(result.savingsPercentage).toBe(20);
    });

    it('should apply highest priority rule first', () => {
      const context = createContext();
      const rules = [
        createTestRule(5, 10), // Low priority, 10% discount
        createTestRule(10, 20), // High priority, 20% discount
      ];

      const result = service.calculatePrice(context, rules);

      expect(result.appliedRules[0].ruleId).toBe('rule-10'); // High priority applied first
      expect(result.finalPrice.amount).toBe(80000);
    });

    it('should stop at non-combinable rule', () => {
      const context = createContext();
      const rules = [
        createTestRule(10, 20, false), // Non-combinable
        createTestRule(5, 10, true), // This won't be applied
      ];

      const result = service.calculatePrice(context, rules);

      expect(result.appliedRules.length).toBe(1);
      expect(result.appliedRules[0].ruleId).toBe('rule-10');
      expect(result.finalPrice.amount).toBe(80000);
    });

    it('should combine multiple combinable rules', () => {
      const context = createContext();
      const rules = [
        createTestRule(10, 20, true), // 20% off = 80,000
        createTestRule(5, 10, true), // 10% off of 80,000 = 72,000
      ];

      const result = service.calculatePrice(context, rules);

      expect(result.appliedRules.length).toBe(2);
      expect(result.finalPrice.amount).toBe(72000);
      expect(result.totalDiscount.amount).toBe(28000);
      expect(result.savingsPercentage).toBe(28);
    });

    it('should respect maxApplicationsPerTransaction', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Limited Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        20,
        null,
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        true,
        1, // Max 1 application
      );

      const context = createContext();
      const rules = [rule, rule]; // Same rule twice

      const result = service.calculatePrice(context, rules);

      expect(result.appliedRules.length).toBe(1); // Only applied once
    });

    it('should not return negative price', () => {
      const context = createContext();
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Huge Discount',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.FIXED_AMOUNT,
        150000, // More than original price
        null,
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        false,
        null,
      );

      const result = service.calculatePrice(context, [rule]);

      expect(result.finalPrice.amount).toBe(0);
      expect(result.totalDiscount.amount).toBe(100000);
    });
  });

  describe('calculateBatchPrices', () => {
    it('should calculate prices for multiple products', () => {
      const contexts = [
        createContext({ productId: 'product-1', originalPrice: Money.create(100000) }),
        createContext({ productId: 'product-2', originalPrice: Money.create(200000) }),
      ];

      const rule1 = createTestRule(10, 20);
      const rule2 = new PricingRule(
        'rule-2',
        'business-1',
        'Product 2 Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        15,
        null,
        null,
        [],
        null,
        null,
        [],
        ['product-2'],
        [],
        [],
        false,
        null,
      );

      const results = service.calculateBatchPrices(contexts, [rule1, rule2]);

      expect(results.size).toBe(2);
      expect(results.get('product-1')?.finalPrice.amount).toBe(80000);
      expect(results.get('product-2')?.finalPrice.amount).toBe(170000);
    });
  });

  describe('previewApplicableRules', () => {
    it('should return only eligible rules', () => {
      const context = createContext();
      const eligibleRule = createTestRule(10, 20);
      const ineligibleRule = new PricingRule(
        'inactive-rule',
        'business-1',
        'Inactive Rule',
        PricingRuleType.TIME_BASED,
        5,
        PricingRuleStatus.INACTIVE, // Not active
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        30,
        null,
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        false,
        null,
      );

      const rules = service.previewApplicableRules(context, [eligibleRule, ineligibleRule]);

      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe('rule-10');
    });

    it('should sort rules by priority', () => {
      const context = createContext();
      const rules = [createTestRule(5, 10), createTestRule(15, 30), createTestRule(10, 20)];

      const result = service.previewApplicableRules(context, rules);

      expect(result[0].priority).toBe(15);
      expect(result[1].priority).toBe(10);
      expect(result[2].priority).toBe(5);
    });
  });

  describe('calculatePotentialSavings', () => {
    it('should identify quantity-based savings opportunities', () => {
      const context = createContext({ quantity: 1 });
      const rule = new PricingRule(
        'qty-rule',
        'business-1',
        'Buy 3 Save',
        PricingRuleType.QUANTITY_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        25,
        3, // Min quantity
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        false,
        null,
      );

      const savings = service.calculatePotentialSavings(context, [rule]);

      expect(savings.length).toBe(1);
      expect(savings[0].requiredQuantity).toBe(2); // Need 2 more
      expect(savings[0].rule.id).toBe('qty-rule');
    });

    it('should not suggest savings for already eligible rules', () => {
      const context = createContext({ quantity: 5 });
      const rule = new PricingRule(
        'qty-rule',
        'business-1',
        'Buy 3 Save',
        PricingRuleType.QUANTITY_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        25,
        3,
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        false,
        null,
      );

      const savings = service.calculatePotentialSavings(context, [rule]);

      expect(savings.length).toBe(0); // Already eligible
    });

    it('should sort savings by potential amount', () => {
      const context = createContext({ quantity: 1 });
      const smallSaving = new PricingRule(
        'small',
        'business-1',
        'Small Save',
        PricingRuleType.QUANTITY_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        10,
        3,
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        false,
        null,
      );

      const largeSaving = new PricingRule(
        'large',
        'business-1',
        'Large Save',
        PricingRuleType.QUANTITY_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        30,
        3,
        null,
        [],
        null,
        null,
        [],
        ['product-1'],
        [],
        [],
        false,
        null,
      );

      const savings = service.calculatePotentialSavings(context, [smallSaving, largeSaving]);

      expect(savings[0].rule.id).toBe('large'); // Higher saving first
      expect(savings[1].rule.id).toBe('small');
    });
  });
});
