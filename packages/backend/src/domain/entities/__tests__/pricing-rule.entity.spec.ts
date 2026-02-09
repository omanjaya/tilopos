import {
  PricingRule,
  PricingRuleType,
  PricingRuleStatus,
  DiscountType,
  CartContext,
} from '../pricing-rule.entity';
import { Money } from '../../value-objects/money';

describe('PricingRule', () => {
  const validFrom = new Date('2026-01-01');
  const validUntil = new Date('2026-12-31');

  const createTestRule = (): PricingRule => {
    return new PricingRule(
      'rule-1',
      'business-1',
      'Test Rule',
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
      [],
      [],
      [],
      false,
      null,
      'Test description',
    );
  };

  describe('Validation', () => {
    it('should create a valid pricing rule', () => {
      const rule = createTestRule();
      expect(rule.name).toBe('Test Rule');
      expect(rule.priority).toBe(10);
    });

    it('should throw error for negative priority', () => {
      expect(() => {
        new PricingRule(
          'rule-1',
          'business-1',
          'Test Rule',
          PricingRuleType.TIME_BASED,
          -1, // Negative priority
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
          [],
          [],
          [],
          false,
          null,
        );
      }).toThrow('Priority must be a non-negative number');
    });

    it('should throw error for negative discount value', () => {
      expect(() => {
        new PricingRule(
          'rule-1',
          'business-1',
          'Test Rule',
          PricingRuleType.TIME_BASED,
          10,
          PricingRuleStatus.ACTIVE,
          validFrom,
          validUntil,
          {},
          DiscountType.PERCENTAGE,
          -10, // Negative discount
          null,
          null,
          [],
          null,
          null,
          [],
          [],
          [],
          [],
          false,
          null,
        );
      }).toThrow('Discount value cannot be negative');
    });

    it('should throw error for percentage discount > 100%', () => {
      expect(() => {
        new PricingRule(
          'rule-1',
          'business-1',
          'Test Rule',
          PricingRuleType.TIME_BASED,
          10,
          PricingRuleStatus.ACTIVE,
          validFrom,
          validUntil,
          {},
          DiscountType.PERCENTAGE,
          150, // > 100%
          null,
          null,
          [],
          null,
          null,
          [],
          [],
          [],
          [],
          false,
          null,
        );
      }).toThrow('Percentage discount cannot exceed 100%');
    });

    it('should throw error for invalid date range', () => {
      expect(() => {
        new PricingRule(
          'rule-1',
          'business-1',
          'Test Rule',
          PricingRuleType.TIME_BASED,
          10,
          PricingRuleStatus.ACTIVE,
          validUntil, // After validFrom
          validFrom, // Before validUntil (inverted)
          {},
          DiscountType.PERCENTAGE,
          20,
          null,
          null,
          [],
          null,
          null,
          [],
          [],
          [],
          [],
          false,
          null,
        );
      }).toThrow('Valid from date must be before valid until date');
    });
  });

  describe('isApplicableAt', () => {
    it('should return true for date within range', () => {
      const rule = createTestRule();
      const testDate = new Date('2026-06-15');
      expect(rule.isApplicableAt(testDate)).toBe(true);
    });

    it('should return false for date before validFrom', () => {
      const rule = createTestRule();
      const testDate = new Date('2025-12-31');
      expect(rule.isApplicableAt(testDate)).toBe(false);
    });

    it('should return false for date after validUntil', () => {
      const rule = createTestRule();
      const testDate = new Date('2027-01-01');
      expect(rule.isApplicableAt(testDate)).toBe(false);
    });

    it('should check day of week restriction', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Weekday Rule',
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
        [1, 2, 3, 4, 5], // Monday-Friday
        null,
        null,
        [],
        [],
        [],
        [],
        false,
        null,
      );

      const monday = new Date('2026-01-05'); // Monday
      const saturday = new Date('2026-01-10'); // Saturday

      expect(rule.isApplicableAt(monday)).toBe(true);
      expect(rule.isApplicableAt(saturday)).toBe(false);
    });

    it('should check time range', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Happy Hour',
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
        '14:00',
        '16:00',
        [],
        [],
        [],
        [],
        false,
        null,
      );

      const withinTime = new Date('2026-06-15T15:00:00');
      const beforeTime = new Date('2026-06-15T13:00:00');
      const afterTime = new Date('2026-06-15T17:00:00');

      expect(rule.isApplicableAt(withinTime)).toBe(true);
      expect(rule.isApplicableAt(beforeTime)).toBe(false);
      expect(rule.isApplicableAt(afterTime)).toBe(false);
    });
  });

  describe('appliesTo', () => {
    it('should apply to all products when no restrictions', () => {
      const rule = createTestRule();
      expect(rule.appliesTo('product-1')).toBe(true);
      expect(rule.appliesTo('product-2', 'category-1')).toBe(true);
    });

    it('should not apply to excluded products', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
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
        [],
        [],
        ['excluded-product'],
        false,
        null,
      );

      expect(rule.appliesTo('excluded-product')).toBe(false);
      expect(rule.appliesTo('other-product')).toBe(true);
    });

    it('should apply to specific products', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
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
        ['product-1', 'product-2'],
        [],
        [],
        false,
        null,
      );

      expect(rule.appliesTo('product-1')).toBe(true);
      expect(rule.appliesTo('product-2')).toBe(true);
      expect(rule.appliesTo('product-3')).toBe(false);
    });

    it('should apply to specific categories', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
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
        [],
        ['category-1'],
        [],
        false,
        null,
      );

      expect(rule.appliesTo('any-product', 'category-1')).toBe(true);
      expect(rule.appliesTo('any-product', 'category-2')).toBe(false);
    });
  });

  describe('evaluateEligibility', () => {
    const createContext = (overrides = {}): CartContext => ({
      productId: 'product-1',
      quantity: 1,
      currentTime: new Date('2026-06-15T15:00:00'),
      ...overrides,
    });

    it('should be eligible for valid context', () => {
      const rule = createTestRule();
      const context = createContext();
      const result = rule.evaluateEligibility(context);
      expect(result.isEligible).toBe(true);
    });

    it('should not be eligible if rule is inactive', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.INACTIVE,
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
        [],
        [],
        [],
        false,
        null,
      );

      const context = createContext();
      const result = rule.evaluateEligibility(context);
      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Rule is not active');
    });

    it('should check minimum quantity', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
        PricingRuleType.QUANTITY_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        20,
        3, // min quantity
        null,
        [],
        null,
        null,
        [],
        [],
        [],
        [],
        false,
        null,
      );

      const belowMin = createContext({ quantity: 2 });
      const aboveMin = createContext({ quantity: 3 });

      expect(rule.evaluateEligibility(belowMin).isEligible).toBe(false);
      expect(rule.evaluateEligibility(aboveMin).isEligible).toBe(true);
    });

    it('should check customer segment', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'VIP Rule',
        PricingRuleType.CUSTOMER_SEGMENT,
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
        ['vip', 'gold'],
        [],
        [],
        [],
        false,
        null,
      );

      const vipContext = createContext({ customerSegment: 'vip' });
      const regularContext = createContext({ customerSegment: 'regular' });
      const noSegmentContext = createContext();

      expect(rule.evaluateEligibility(vipContext).isEligible).toBe(true);
      expect(rule.evaluateEligibility(regularContext).isEligible).toBe(false);
      expect(rule.evaluateEligibility(noSegmentContext).isEligible).toBe(false);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.PERCENTAGE,
        25, // 25%
        null,
        null,
        [],
        null,
        null,
        [],
        [],
        [],
        [],
        false,
        null,
      );

      const originalPrice = Money.create(100000);
      const discount = rule.calculateDiscount(originalPrice);
      expect(discount.amount).toBe(25000);
    });

    it('should calculate fixed amount discount correctly', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.FIXED_AMOUNT,
        15000, // Rp 15.000
        null,
        null,
        [],
        null,
        null,
        [],
        [],
        [],
        [],
        false,
        null,
      );

      const originalPrice = Money.create(100000);
      const discount = rule.calculateDiscount(originalPrice);
      expect(discount.amount).toBe(15000);
    });
  });

  describe('applyDiscount', () => {
    it('should apply discount and return final price', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
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
        [],
        [],
        [],
        false,
        null,
      );

      const originalPrice = Money.create(100000);
      const finalPrice = rule.applyDiscount(originalPrice);
      expect(finalPrice.amount).toBe(70000);
    });

    it('should not return negative price', () => {
      const rule = new PricingRule(
        'rule-1',
        'business-1',
        'Test Rule',
        PricingRuleType.TIME_BASED,
        10,
        PricingRuleStatus.ACTIVE,
        validFrom,
        validUntil,
        {},
        DiscountType.FIXED_AMOUNT,
        150000, // Discount > original price
        null,
        null,
        [],
        null,
        null,
        [],
        [],
        [],
        [],
        false,
        null,
      );

      const originalPrice = Money.create(100000);
      const finalPrice = rule.applyDiscount(originalPrice);
      expect(finalPrice.amount).toBe(0);
    });
  });
});
