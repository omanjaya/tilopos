import { Prisma } from '@prisma/client';
import { PromotionRulesEngine, type PromotionRuleContext } from './promotion-rules.engine';
import type { PrismaService } from '@infrastructure/database/prisma.service';

const D = (v: number) => new Prisma.Decimal(v);

describe('PromotionRulesEngine', () => {
  const now = new Date('2026-09-27T05:00:00Z');
  let prisma: {
    promotion: { findMany: jest.Mock; findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    customer: { findFirst: jest.Mock };
    voucher: { findFirst: jest.Mock };
    $executeRaw: jest.Mock;
  };
  let engine: PromotionRulesEngine;

  const promo = (over: Record<string, unknown> = {}) => ({
    id: 'promo-1',
    businessId: 'biz-1',
    name: 'Promo',
    description: null,
    discountType: 'percentage',
    discountValue: D(50),
    minPurchase: null,
    maxDiscount: null,
    validFrom: new Date('2026-09-01T00:00:00Z'),
    validUntil: new Date('2026-10-01T00:00:00Z'),
    usageLimit: null,
    usedCount: 0,
    applicableTo: {},
    isActive: true,
    ...over,
  });

  const ctx = (over: Partial<PromotionRuleContext> = {}): PromotionRuleContext => ({
    businessId: 'biz-1',
    outletId: 'outlet-1',
    now,
    items: [
      { productId: 'prod-a', categoryId: 'cat-1', quantity: 1, unitPrice: 20000 },
      { productId: 'prod-b', categoryId: 'cat-2', quantity: 1, unitPrice: 80000 },
    ],
    ...over,
  });

  beforeEach(() => {
    prisma = {
      promotion: { findMany: jest.fn(), findFirst: jest.fn() },
      product: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      voucher: { findFirst: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    engine = new PromotionRulesEngine(prisma as unknown as PrismaService);
  });

  it('applies a product-restricted percentage only to matching lines', async () => {
    prisma.promotion.findFirst.mockResolvedValue(
      promo({ applicableTo: { productIds: ['prod-a'] } }),
    );
    const result = await engine.evaluatePromotionById(ctx(), 'promo-1');
    expect(result?.discount.toNumber()).toBe(10000);
  });

  it('matches category-restricted promotions', async () => {
    prisma.promotion.findFirst.mockResolvedValue(
      promo({ applicableTo: { categoryIds: ['cat-2'] } }),
    );
    const result = await engine.evaluatePromotionById(ctx(), 'promo-1');
    expect(result?.discount.toNumber()).toBe(40000);
  });

  it('BOGO needs two units and discounts the cheaper one', async () => {
    prisma.promotion.findFirst.mockResolvedValue(
      promo({
        discountType: 'bogo',
        discountValue: D(100),
        applicableTo: { productIds: ['prod-a'] },
      }),
    );
    expect(await engine.evaluatePromotionById(ctx(), 'promo-1')).toBeNull();

    const two = await engine.evaluatePromotionById(
      ctx({ items: [{ productId: 'prod-a', categoryId: null, quantity: 2, unitPrice: 20000 }] }),
      'promo-1',
    );
    expect(two?.discount.toNumber()).toBe(20000);
  });

  it('outlet-restricted promotions never match without an outlet', async () => {
    prisma.promotion.findFirst.mockResolvedValue(
      promo({ applicableTo: { outlets: ['outlet-1'] } }),
    );
    expect(await engine.evaluatePromotionById(ctx({ outletId: null }), 'promo-1')).toBeNull();
    expect(await engine.evaluatePromotionById(ctx(), 'promo-1')).not.toBeNull();
  });

  it('segment-restricted promotions fail closed without a matching customer', async () => {
    prisma.promotion.findFirst.mockResolvedValue(
      promo({ applicableTo: { customerSegments: ['vip'] } }),
    );
    expect(await engine.evaluatePromotionById(ctx(), 'promo-1')).toBeNull();

    prisma.customer.findFirst.mockResolvedValue({
      visitCount: 3,
      loyaltyTier: 'VIP',
      customerType: 'individual',
    });
    expect(
      await engine.evaluatePromotionById(ctx({ customerId: 'c-1' }), 'promo-1'),
    ).not.toBeNull();
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c-1', businessId: 'biz-1' } }),
    );
  });

  it('ignores exhausted, inactive or expired promotions', async () => {
    prisma.promotion.findFirst.mockResolvedValue(promo({ usageLimit: 5, usedCount: 5 }));
    expect(await engine.evaluatePromotionById(ctx(), 'promo-1')).toBeNull();
    prisma.promotion.findFirst.mockResolvedValue(promo({ isActive: false }));
    expect(await engine.evaluatePromotionById(ctx(), 'promo-1')).toBeNull();
    prisma.promotion.findFirst.mockResolvedValue(
      promo({ validUntil: new Date('2026-09-01T00:00:00Z') }),
    );
    expect(await engine.evaluatePromotionById(ctx(), 'promo-1')).toBeNull();
  });

  it('caps percentage discounts with maxDiscount', async () => {
    prisma.promotion.findFirst.mockResolvedValue(promo({ maxDiscount: D(15000) }));
    const result = await engine.evaluatePromotionById(ctx(), 'promo-1');
    expect(result?.discount.toNumber()).toBe(15000);
  });

  it('consumes usage atomically and reports exhaustion', async () => {
    expect(await engine.incrementUsageCount(prisma as never, 'promo-1', 'biz-1')).toBe(true);
    prisma.$executeRaw.mockResolvedValue(0);
    expect(await engine.incrementUsageCount(prisma as never, 'promo-1', 'biz-1')).toBe(false);
    const sql = (prisma.$executeRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain('used_count < usage_limit');
    expect(sql).toContain('business_id');
  });

  it('rejects vouchers of an inactive promotion', async () => {
    prisma.voucher.findFirst.mockResolvedValue({
      id: 'v-1',
      usedAt: null,
      expiresAt: null,
      remainingValue: null,
      promotionId: 'promo-1',
      promotion: promo({ isActive: false }),
    });
    const result = await engine.evaluateVoucher(ctx(), 'code');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Promotion is not active');
  });
});
