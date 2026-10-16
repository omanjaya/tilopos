import { Prisma } from '@prisma/client';
import { SalePricingService, type SalePricingContext, roundToStep } from './sale-pricing.service';
import { PromotionRulesEngine } from './promotion-rules.engine';
import { PricingCalculatorService } from '@domain/services/pricing-calculator.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TaxConfigurationRepository } from '@infrastructure/repositories/settings/tax-configuration.repository';
import type { FeatureService } from '@modules/business/services/feature.service';
import type { IPricingRuleRepository } from '../repositories/pricing-rule.repository';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';

const D = (v: number) => new Prisma.Decimal(v);

describe('SalePricingService', () => {
  let prisma: Record<string, Record<string, jest.Mock>>;
  let featureService: { isFeatureEnabled: jest.Mock };
  let taxRepo: { getTaxConfig: jest.Mock };
  let rulesRepo: { findAll: jest.Mock };
  let service: SalePricingService;

  const ctx = (over: Partial<SalePricingContext> = {}): SalePricingContext => ({
    businessId: 'biz-1',
    outletId: 'outlet-1',
    role: 'cashier',
    orderType: 'takeaway',
    applyCashRounding: false,
    ...over,
  });

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Kopi',
            basePrice: D(20000),
            categoryId: 'cat-1',
            trackStock: true,
            isActive: true,
          },
        ]),
      },
      productVariant: { findMany: jest.fn().mockResolvedValue([]) },
      bundlePackage: { findMany: jest.fn().mockResolvedValue([]) },
      modifier: { findMany: jest.fn().mockResolvedValue([]) },
      priceTier: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findFirst: jest.fn().mockResolvedValue(null) },
      stockLevel: { findMany: jest.fn().mockResolvedValue([]) },
      promotion: { findFirst: jest.fn() },
      voucher: { findFirst: jest.fn() },
    };
    featureService = { isFeatureEnabled: jest.fn().mockResolvedValue(false) };
    taxRepo = {
      getTaxConfig: jest
        .fn()
        .mockResolvedValue({ taxRate: 0, serviceCharge: 0, taxInclusive: false }),
    };
    rulesRepo = { findAll: jest.fn().mockResolvedValue([]) };
    const engine = new PromotionRulesEngine(prisma as unknown as PrismaService);
    service = new SalePricingService(
      prisma as unknown as PrismaService,
      taxRepo as unknown as TaxConfigurationRepository,
      featureService as unknown as FeatureService,
      engine,
      new PricingCalculatorService(),
      rulesRepo as unknown as IPricingRuleRepository,
    );
  });

  describe('server price enforcement', () => {
    it('uses the DB price and ignores a client unitPrice when price editing is not allowed', async () => {
      const sale = await service.priceSale(ctx(), [
        { productId: 'prod-1', quantity: 2, unitPrice: 1 },
      ]);
      expect(sale.lines[0].unitPrice.toNumber()).toBe(20000);
      expect(sale.subtotal.toNumber()).toBe(40000);
      expect(sale.priceOverrides).toHaveLength(0);
      // cashier never even reaches the feature lookup
      expect(featureService.isFeatureEnabled).not.toHaveBeenCalled();
    });

    it('ignores the override for a supervisor when pos_price_editing is disabled', async () => {
      const sale = await service.priceSale(ctx({ role: 'supervisor' }), [
        { productId: 'prod-1', quantity: 1, unitPrice: 5000 },
      ]);
      expect(featureService.isFeatureEnabled).toHaveBeenCalledWith('biz-1', 'pos_price_editing');
      expect(sale.grandTotal.toNumber()).toBe(20000);
    });

    it('honours and records the override with feature enabled and role >= supervisor', async () => {
      featureService.isFeatureEnabled.mockResolvedValue(true);
      const sale = await service.priceSale(ctx({ role: 'supervisor' }), [
        { productId: 'prod-1', quantity: 1, unitPrice: 15000 },
      ]);
      expect(sale.grandTotal.toNumber()).toBe(15000);
      expect(sale.priceOverrides).toEqual([
        expect.objectContaining({ productId: 'prod-1', serverPrice: 20000, overridePrice: 15000 }),
      ]);
    });

    it('scopes products to the business and rejects unknown/foreign products', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await expect(
        service.priceSale(ctx(), [{ productId: 'foreign', quantity: 1 }]),
      ).rejects.toBeInstanceOf(AppError);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['foreign'] }, businessId: 'biz-1' } }),
      );
    });

    it('rejects a variant that belongs to another product', async () => {
      prisma.productVariant.findMany.mockResolvedValue([
        { id: 'var-x', productId: 'other', name: 'Big', price: D(1000), isActive: true },
      ]);
      await expect(
        service.priceSale(ctx(), [{ productId: 'prod-1', variantId: 'var-x', quantity: 1 }]),
      ).rejects.toThrow(/Variant var-x not found/);
    });

    it('prices a variant and attached modifiers from the DB', async () => {
      prisma.productVariant.findMany.mockResolvedValue([
        { id: 'var-1', productId: 'prod-1', name: 'Large', price: D(25000), isActive: true },
      ]);
      prisma.modifier.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          name: 'Extra shot',
          price: D(5000),
          modifierGroup: { productModifierGroups: [{ productId: 'prod-1' }] },
        },
      ]);
      const sale = await service.priceSale(ctx(), [
        { productId: 'prod-1', variantId: 'var-1', modifierIds: ['mod-1'], quantity: 2 },
      ]);
      expect(sale.lines[0].unitPrice.toNumber()).toBe(30000);
      expect(sale.subtotal.toNumber()).toBe(60000);
    });

    it('rejects a modifier not attached to the product', async () => {
      prisma.modifier.findMany.mockResolvedValue([
        {
          id: 'mod-1',
          name: 'Extra',
          price: D(1),
          modifierGroup: { productModifierGroups: [{ productId: 'other' }] },
        },
      ]);
      await expect(
        service.priceSale(ctx(), [{ productId: 'prod-1', modifierIds: ['mod-1'], quantity: 1 }]),
      ).rejects.toThrow(/Modifier mod-1/);
    });

    it('applies a quantity price tier', async () => {
      prisma.priceTier.findMany.mockResolvedValue([
        { productId: 'prod-1', minQuantity: 10, maxQuantity: null, price: D(18000) },
      ]);
      const sale = await service.priceSale(ctx(), [{ productId: 'prod-1', quantity: 10 }]);
      expect(sale.subtotal.toNumber()).toBe(180000);
    });

    it('prices bundles from the DB and expands component stock', async () => {
      prisma.bundlePackage.findMany.mockResolvedValue([
        {
          id: 'b-1',
          name: 'Paket',
          price: D(30000),
          items: [
            { productId: 'p-a', variantId: null, quantity: D(2), product: { trackStock: true } },
          ],
        },
      ]);
      const sale = await service.priceSale(ctx(), [{ bundleId: 'b-1', quantity: 2, unitPrice: 1 }]);
      expect(sale.subtotal.toNumber()).toBe(60000);
      expect(sale.stockDeductions).toEqual([
        expect.objectContaining({ productId: 'p-a', quantity: D(4) }),
      ]);
    });
  });

  describe('discount validation', () => {
    it('caps manual discounts per role (cashier 10%)', async () => {
      await expect(
        service.priceSale(
          ctx(),
          [{ productId: 'prod-1', quantity: 1 }],
          [{ type: 'percentage', value: 50 }],
        ),
      ).rejects.toThrow(/10% limit/);

      const ok = await service.priceSale(
        ctx(),
        [{ productId: 'prod-1', quantity: 1 }],
        [{ type: 'fixed', value: 2000 }],
      );
      expect(ok.discountAmount.toNumber()).toBe(2000);
      expect(ok.grandTotal.toNumber()).toBe(18000);
    });

    it('lets a manager give a larger manual discount', async () => {
      const sale = await service.priceSale(
        ctx({ role: 'manager' }),
        [{ productId: 'prod-1', quantity: 1 }],
        [{ type: 'percentage', value: 50 }],
      );
      expect(sale.discountAmount.toNumber()).toBe(10000);
    });

    it('computes promotion discounts server-side and ignores the client value', async () => {
      const now = new Date();
      prisma.promotion.findFirst.mockResolvedValue({
        id: 'promo-1',
        businessId: 'biz-1',
        name: '10%',
        description: null,
        discountType: 'percentage',
        discountValue: D(10),
        minPurchase: null,
        maxDiscount: null,
        validFrom: new Date(now.getTime() - 1000),
        validUntil: new Date(now.getTime() + 60_000),
        usageLimit: null,
        usedCount: 0,
        applicableTo: {},
        isActive: true,
      });
      const sale = await service.priceSale(
        ctx(),
        [{ productId: 'prod-1', quantity: 1 }],
        [{ type: 'fixed', value: 999999, promotionId: 'promo-1' }],
      );
      expect(prisma.promotion.findFirst).toHaveBeenCalledWith({
        where: { id: 'promo-1', businessId: 'biz-1' },
      });
      expect(sale.discountAmount.toNumber()).toBe(2000);
      expect(sale.discounts[0]).toMatchObject({ source: 'promotion', promotionId: 'promo-1' });
    });

    it('rejects an expired/foreign promotion', async () => {
      prisma.promotion.findFirst.mockResolvedValue(null);
      await expect(
        service.priceSale(
          ctx(),
          [{ productId: 'prod-1', quantity: 1 }],
          [{ type: 'fixed', value: 1000, promotionId: 'promo-x' }],
        ),
      ).rejects.toBeInstanceOf(BusinessError);
    });

    it('rejects an already used voucher', async () => {
      prisma.voucher.findFirst.mockResolvedValue({
        id: 'v-1',
        code: 'ABC',
        usedAt: new Date(),
        expiresAt: null,
        remainingValue: null,
        promotionId: null,
        promotion: null,
      });
      await expect(
        service.priceSale(
          ctx(),
          [{ productId: 'prod-1', quantity: 1 }],
          [{ type: 'fixed', value: 5000, voucherCode: 'abc' }],
        ),
      ).rejects.toThrow('Voucher already used');
      expect(prisma.voucher.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'ABC', businessId: 'biz-1', isActive: true },
        }),
      );
    });
  });

  describe('totals', () => {
    it('adds service charge (dine-in) and exclusive tax, rounding cash to Rp500', async () => {
      taxRepo.getTaxConfig.mockResolvedValue({
        taxRate: 11,
        serviceCharge: 5,
        taxInclusive: false,
      });
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'X',
          basePrice: D(10100),
          categoryId: null,
          trackStock: false,
          isActive: true,
        },
      ]);
      const sale = await service.priceSale(ctx({ orderType: 'dine_in', applyCashRounding: true }), [
        { productId: 'prod-1', quantity: 1 },
      ]);
      // service 505, tax round((10100+505)*0.11)=1167, raw 11772 -> 12000
      expect(sale.serviceCharge.toNumber()).toBe(505);
      expect(sale.taxAmount.toNumber()).toBe(1167);
      expect(sale.grandTotal.toNumber()).toBe(12000);
      expect(sale.roundingAmount.toNumber()).toBe(228);
    });

    it('does not round non-cash sales', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'X',
          basePrice: D(10100),
          categoryId: null,
          trackStock: false,
          isActive: true,
        },
      ]);
      const sale = await service.priceSale(ctx(), [{ productId: 'prod-1', quantity: 1 }]);
      expect(sale.grandTotal.toNumber()).toBe(10100);
      expect(sale.roundingAmount.toNumber()).toBe(0);
    });

    it('roundToStep rounds half up', () => {
      expect(roundToStep(1250, 500).toNumber()).toBe(1500);
      expect(roundToStep(1249, 500).toNumber()).toBe(1000);
    });
  });
});
