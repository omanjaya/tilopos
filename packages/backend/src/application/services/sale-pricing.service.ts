import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TaxConfigurationRepository } from '@infrastructure/repositories/settings/tax-configuration.repository';
import { FeatureService } from '@modules/business/services/feature.service';
import type { IPricingRuleRepository } from '../repositories/pricing-rule.repository';
import { PricingCalculatorService } from '@domain/services/pricing-calculator.service';
import { Money } from '@domain/value-objects/money';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { ROLE_HIERARCHY } from '@shared/constants/roles';
import {
  money,
  roundRupiah,
  sumMoney,
  percentOf,
  minMoney,
  nonNegative,
  type MoneyInput,
} from '@shared/utils/money';
import { PromotionRulesEngine, type PromotionCartLine } from './promotion-rules.engine';

export const PRICE_EDITING_FEATURE = 'pos_price_editing';
export const PRICING_RULE_REPOSITORY = 'IPricingRuleRepository';

/** Cash payments are rounded to this step (Indonesian cash convention). */
export const CASH_ROUNDING_STEP = 500;

/**
 * Largest manual (non-promotion) discount per role, as % of the subtotal.
 * Mirrors the POS discount modal (packages/web, discount-modal).
 */
export const MANUAL_DISCOUNT_CAP_PERCENT: Record<string, number> = {
  super_admin: 100,
  owner: 100,
  manager: 100,
  supervisor: 50,
  cashier: 10,
};

export interface SaleLineInput {
  productId?: string;
  bundleId?: string;
  variantId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
  /** Price override; honoured only with `pos_price_editing` AND role >= supervisor. */
  unitPrice?: number;
}

export interface SaleDiscountInput {
  type: 'percentage' | 'fixed';
  value: number;
  promotionId?: string;
  voucherCode?: string;
}

export interface SalePricingContext {
  businessId: string;
  outletId: string;
  role: string;
  customerId?: string | null;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  /** Apply the Rp500 cash rounding (only when every payment is cash). */
  applyCashRounding: boolean;
  /** Service charge is only charged for dine-in orders; credit sales pass false. */
  applyServiceCharge?: boolean;
  now?: Date;
}

export interface PricedModifier {
  modifierId: string;
  modifierName: string;
  price: Prisma.Decimal;
}

export interface PricedLine {
  productId: string | null;
  variantId: string | null;
  bundleId: string | null;
  productName: string;
  variantName: string | null;
  /** Unit price including modifiers. */
  unitPrice: Prisma.Decimal;
  quantity: number;
  subtotal: Prisma.Decimal;
  notes: string | null;
  modifiers: PricedModifier[];
}

export interface StockDeduction {
  productId: string;
  variantId: string | null;
  quantity: Prisma.Decimal;
  note: string;
}

export interface PriceOverride {
  productId: string | null;
  bundleId: string | null;
  variantId: string | null;
  serverPrice: number;
  overridePrice: number;
}

export interface AppliedDiscount {
  source: 'promotion' | 'voucher' | 'manual';
  promotionId: string | null;
  voucherId: string | null;
  amount: Prisma.Decimal;
}

export interface PricedSale {
  lines: PricedLine[];
  stockDeductions: StockDeduction[];
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  discounts: AppliedDiscount[];
  serviceCharge: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  roundingAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  priceOverrides: PriceOverride[];
}

const roleRank = (role: string) => ROLE_HIERARCHY[role] ?? 0;

/**
 * Server-side pricing for a sale (Docs/ENGINEERING-RULES.md R3/R8).
 *
 * Every price comes from the DB (product, variant, price tier, active pricing
 * rules, bundle, modifiers) and every referenced id is verified against the
 * caller's business. Discounts come only from validated promotions/vouchers or
 * a manual discount within the caller's role cap. All money is Prisma.Decimal
 * rounded to whole rupiah.
 */
@Injectable()
export class SalePricingService {
  private readonly logger = new Logger(SalePricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxConfigRepo: TaxConfigurationRepository,
    private readonly featureService: FeatureService,
    private readonly promotionRules: PromotionRulesEngine,
    private readonly pricingCalculator: PricingCalculatorService,
    @Inject(PRICING_RULE_REPOSITORY)
    private readonly pricingRuleRepo: IPricingRuleRepository,
  ) {}

  async priceSale(
    ctx: SalePricingContext,
    items: SaleLineInput[],
    discounts: SaleDiscountInput[] = [],
  ): Promise<PricedSale> {
    if (items.length === 0) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'A sale needs at least one item');
    }
    const now = ctx.now ?? new Date();

    const wantsOverride = items.some((i) => i.unitPrice !== undefined && i.unitPrice !== null);
    const overrideAllowed = wantsOverride ? await this.canOverridePrice(ctx) : false;

    const { lines, stockDeductions, priceOverrides, promoLines } = await this.priceLines(
      ctx,
      items,
      overrideAllowed,
      now,
    );

    const subtotal = sumMoney(lines.map((l) => l.subtotal));
    const applied = await this.resolveDiscounts(ctx, discounts, promoLines, subtotal, now);
    const discountAmount = minMoney(sumMoney(applied.map((d) => d.amount)), subtotal);

    const totals = await this.computeTotals(ctx, subtotal, discountAmount);

    return {
      lines,
      stockDeductions,
      subtotal,
      discountAmount,
      discounts: applied,
      priceOverrides,
      ...totals,
    };
  }

  /** Whether this caller may override unit prices (feature + role, R8). */
  async canOverridePrice(ctx: Pick<SalePricingContext, 'businessId' | 'role'>): Promise<boolean> {
    if (roleRank(ctx.role) < roleRank('supervisor')) return false;
    return this.featureService.isFeatureEnabled(ctx.businessId, PRICE_EDITING_FEATURE);
  }

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------

  private async priceLines(
    ctx: SalePricingContext,
    items: SaleLineInput[],
    overrideAllowed: boolean,
    now: Date,
  ) {
    const businessId = ctx.businessId;
    const productIds = uniq(items.filter((i) => !i.bundleId).map((i) => i.productId));
    const variantIds = uniq(items.filter((i) => !i.bundleId).map((i) => i.variantId));
    const bundleIds = uniq(items.map((i) => i.bundleId));
    const modifierIds = uniq(items.flatMap((i) => i.modifierIds ?? []));

    for (const item of items) {
      if (!item.bundleId && !item.productId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Each item needs a productId or bundleId');
      }
    }

    const [products, variants, bundles, modifiers, tiers, customer] = await Promise.all([
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds }, businessId },
            select: {
              id: true,
              name: true,
              basePrice: true,
              categoryId: true,
              trackStock: true,
              isActive: true,
            },
          })
        : Promise.resolve([]),
      variantIds.length
        ? this.prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { businessId } },
            select: { id: true, productId: true, name: true, price: true, isActive: true },
          })
        : Promise.resolve([]),
      bundleIds.length
        ? this.prisma.bundlePackage.findMany({
            where: { id: { in: bundleIds }, businessId, isActive: true },
            include: {
              items: {
                select: {
                  productId: true,
                  variantId: true,
                  quantity: true,
                  product: { select: { trackStock: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      modifierIds.length
        ? this.prisma.modifier.findMany({
            where: {
              id: { in: modifierIds },
              isActive: true,
              modifierGroup: { businessId, isActive: true },
            },
            select: {
              id: true,
              name: true,
              price: true,
              modifierGroup: { select: { productModifierGroups: { select: { productId: true } } } },
            },
          })
        : Promise.resolve([]),
      productIds.length
        ? this.prisma.priceTier.findMany({
            where: { productId: { in: productIds }, isActive: true, product: { businessId } },
            select: { productId: true, minQuantity: true, maxQuantity: true, price: true },
          })
        : Promise.resolve([]),
      ctx.customerId
        ? this.prisma.customer.findFirst({
            where: { id: ctx.customerId, businessId },
            select: { loyaltyTier: true },
          })
        : Promise.resolve(null),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const variantById = new Map(variants.map((v) => [v.id, v]));
    const bundleById = new Map(bundles.map((b) => [b.id, b]));
    const modifierById = new Map(modifiers.map((m) => [m.id, m]));

    const rules =
      productIds.length > 0
        ? await this.pricingRuleRepo.findAll({
            businessId,
            status: 'active',
            activeAt: now,
            productIds,
            categoryIds: uniq(products.map((p) => p.categoryId)),
          })
        : [];
    const stockByKey =
      rules.length > 0 ? await this.loadStock(ctx.outletId, productIds) : new Map();

    const lines: PricedLine[] = [];
    const stockDeductions: StockDeduction[] = [];
    const priceOverrides: PriceOverride[] = [];
    const promoLines: PromotionCartLine[] = [];

    // Base (pre-rule) cart total, used by cart-level pricing-rule conditions.
    const cartItemCount = items.reduce((n, i) => n + i.quantity, 0);
    const baseCartTotal = sumMoney(
      items.map((i) => {
        if (i.bundleId) return money(bundleById.get(i.bundleId)?.price).times(i.quantity);
        const p = i.productId ? productById.get(i.productId) : undefined;
        const v = i.variantId ? variantById.get(i.variantId) : undefined;
        return money(v?.price ?? p?.basePrice).times(i.quantity);
      }),
    );
    const ruleApplications = new Map<string, number>();

    for (const item of items) {
      const quantity = item.quantity;
      if (!(quantity > 0)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Quantity must be positive');
      }

      if (item.bundleId) {
        const bundle = bundleById.get(item.bundleId);
        if (!bundle) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            `Bundle ${item.bundleId} not found or inactive`,
          );
        }
        const serverPrice = money(bundle.price);
        const unitPrice = this.applyOverride(item, serverPrice, overrideAllowed, priceOverrides, {
          productId: null,
          bundleId: bundle.id,
          variantId: null,
        });
        lines.push({
          productId: null,
          variantId: null,
          bundleId: bundle.id,
          productName: bundle.name,
          variantName: null,
          unitPrice,
          quantity,
          subtotal: roundRupiah(unitPrice.times(quantity)),
          notes: item.notes || null,
          modifiers: [],
        });
        promoLines.push({ productId: null, categoryId: null, quantity, unitPrice });
        for (const component of bundle.items) {
          if (!component.product.trackStock) continue;
          stockDeductions.push({
            productId: component.productId,
            variantId: component.variantId ?? null,
            quantity: money(component.quantity).times(quantity),
            note: `Bundle sale component: ${bundle.name}`,
          });
        }
        continue;
      }

      const productId = item.productId as string;
      const product = productById.get(productId);
      if (!product || !product.isActive) {
        throw new AppError(
          ErrorCode.PRODUCT_NOT_FOUND,
          `Product ${productId} not found or inactive`,
        );
      }

      let basePrice = money(product.basePrice);
      let variantName: string | null = null;
      if (item.variantId) {
        const variant = variantById.get(item.variantId);
        if (!variant || variant.productId !== productId || !variant.isActive) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            `Variant ${item.variantId} not found for product ${productId}`,
          );
        }
        basePrice = money(variant.price);
        variantName = variant.name;
      } else {
        const tier = tiers
          .filter(
            (t) =>
              t.productId === productId &&
              quantity >= t.minQuantity &&
              (t.maxQuantity === null || quantity <= t.maxQuantity),
          )
          .sort((a, b) => b.minQuantity - a.minQuantity)[0];
        if (tier) basePrice = money(tier.price);
      }

      if (rules.length > 0) {
        const result = this.pricingCalculator.calculatePrice(
          {
            productId,
            categoryId: product.categoryId ?? undefined,
            quantity,
            originalPrice: Money.create(basePrice.toNumber()),
            customerSegment: customer?.loyaltyTier,
            currentTime: now,
            stockLevel: stockByKey.get(`${productId}:${item.variantId ?? ''}`),
            cartTotal: baseCartTotal.toNumber(),
            cartItemCount,
          },
          rules,
          ruleApplications,
        );
        basePrice = roundRupiah(result.finalPrice.amount);
      }

      const itemModifierIds = uniq(item.modifierIds ?? []);
      const priced: PricedModifier[] = itemModifierIds.map((id) => {
        const mod = modifierById.get(id);
        const attached = mod?.modifierGroup.productModifierGroups.some(
          (g) => g.productId === productId,
        );
        if (!mod || !attached) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            `Modifier ${id} is not available for product ${productId}`,
          );
        }
        return { modifierId: mod.id, modifierName: mod.name, price: money(mod.price) };
      });
      const modifierTotal = sumMoney(priced.map((m) => m.price));

      const unitBase = this.applyOverride(item, basePrice, overrideAllowed, priceOverrides, {
        productId,
        bundleId: null,
        variantId: item.variantId ?? null,
      });
      const unitPrice = unitBase.plus(modifierTotal);

      lines.push({
        productId,
        variantId: item.variantId ?? null,
        bundleId: null,
        productName: product.name,
        variantName,
        unitPrice,
        quantity,
        subtotal: roundRupiah(unitPrice.times(quantity)),
        notes: item.notes || null,
        modifiers: priced,
      });
      promoLines.push({
        productId,
        variantId: item.variantId ?? null,
        categoryId: product.categoryId,
        quantity,
        unitPrice,
      });
      if (product.trackStock) {
        stockDeductions.push({
          productId,
          variantId: item.variantId ?? null,
          quantity: money(quantity),
          note: `Sale: ${product.name}`,
        });
      }
    }

    return { lines, stockDeductions, priceOverrides, promoLines };
  }

  private applyOverride(
    item: SaleLineInput,
    serverPrice: Prisma.Decimal,
    overrideAllowed: boolean,
    overrides: PriceOverride[],
    ref: Pick<PriceOverride, 'productId' | 'bundleId' | 'variantId'>,
  ): Prisma.Decimal {
    if (item.unitPrice === undefined || item.unitPrice === null) return serverPrice;
    const requested = roundRupiah(item.unitPrice);
    if (requested.equals(serverPrice)) return serverPrice;
    if (!overrideAllowed) {
      // Client prices are never trusted; the server price applies (R8).
      this.logger.warn(
        `Ignored unauthorised price override for ${ref.productId ?? ref.bundleId}: ${requested.toString()} (server ${serverPrice.toString()})`,
      );
      return serverPrice;
    }
    overrides.push({
      ...ref,
      serverPrice: serverPrice.toNumber(),
      overridePrice: requested.toNumber(),
    });
    return requested;
  }

  private async loadStock(outletId: string, productIds: string[]): Promise<Map<string, number>> {
    const levels = await this.prisma.stockLevel.findMany({
      where: { outletId, productId: { in: productIds } },
      select: { productId: true, variantId: true, quantity: true },
    });
    return new Map(
      levels.map((l) => [`${l.productId}:${l.variantId ?? ''}`, money(l.quantity).toNumber()]),
    );
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  private async resolveDiscounts(
    ctx: SalePricingContext,
    discounts: SaleDiscountInput[],
    promoLines: PromotionCartLine[],
    subtotal: Prisma.Decimal,
    now: Date,
  ): Promise<AppliedDiscount[]> {
    const applied: AppliedDiscount[] = [];
    const seenPromotions = new Set<string>();
    const seenVouchers = new Set<string>();
    let manualTotal = money(0);
    const promoCtx = {
      businessId: ctx.businessId,
      outletId: ctx.outletId,
      customerId: ctx.customerId ?? null,
      items: promoLines,
      now,
    };

    for (const discount of discounts) {
      if (discount.voucherCode) {
        const code = discount.voucherCode.trim().toUpperCase();
        if (seenVouchers.has(code)) continue;
        seenVouchers.add(code);
        const voucher = await this.promotionRules.evaluateVoucher(promoCtx, code);
        if (!voucher.valid || !voucher.voucherId) {
          throw new BusinessError(ErrorCode.INVALID_VOUCHER, voucher.error ?? 'Invalid voucher');
        }
        if (voucher.promotionId) seenPromotions.add(voucher.promotionId);
        applied.push({
          source: 'voucher',
          voucherId: voucher.voucherId,
          // Stored-value vouchers do not consume a promotion use.
          promotionId: voucher.storedValue ? null : voucher.promotionId,
          amount: voucher.discount,
        });
        continue;
      }

      if (discount.promotionId) {
        if (seenPromotions.has(discount.promotionId)) continue;
        seenPromotions.add(discount.promotionId);
        const result = await this.promotionRules.evaluatePromotionById(
          promoCtx,
          discount.promotionId,
        );
        if (!result) {
          throw new BusinessError(
            ErrorCode.INVALID_VOUCHER,
            'Promotion is not applicable to this transaction',
          );
        }
        applied.push({
          source: 'promotion',
          promotionId: result.promotion.id,
          voucherId: null,
          amount: result.discount,
        });
        continue;
      }

      // Manual discount: client value, bounded by the caller's role cap.
      if (!(discount.value >= 0)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Discount value must be >= 0');
      }
      if (discount.type === 'percentage' && discount.value > 100) {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          'Percentage discount cannot exceed 100%',
        );
      }
      const amount =
        discount.type === 'percentage'
          ? roundRupiah(percentOf(subtotal, discount.value))
          : roundRupiah(discount.value);
      manualTotal = manualTotal.plus(amount);
    }

    if (manualTotal.gt(0)) {
      const capPercent = MANUAL_DISCOUNT_CAP_PERCENT[ctx.role] ?? 0;
      const cap = roundRupiah(percentOf(subtotal, capPercent));
      if (manualTotal.gt(cap)) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED_ACTION,
          `Manual discount exceeds the ${capPercent}% limit for role ${ctx.role}`,
          403,
        );
      }
      applied.push({
        source: 'manual',
        promotionId: null,
        voucherId: null,
        amount: minMoney(manualTotal, subtotal),
      });
    }

    return applied;
  }

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  private async computeTotals(
    ctx: SalePricingContext,
    subtotal: Prisma.Decimal,
    discountAmount: Prisma.Decimal,
  ) {
    const taxConfig = await this.taxConfigRepo.getTaxConfig(ctx.businessId, ctx.outletId);
    const taxRate = money(taxConfig.taxRate).dividedBy(100);
    const serviceRate = money(taxConfig.serviceCharge).dividedBy(100);
    const taxable = nonNegative(subtotal.minus(discountAmount));

    const chargeService = ctx.applyServiceCharge ?? ctx.orderType === 'dine_in';
    const serviceCharge = chargeService ? roundRupiah(taxable.times(serviceRate)) : money(0);
    const base = taxable.plus(serviceCharge);

    let taxAmount: Prisma.Decimal;
    let rawTotal: Prisma.Decimal;
    if (taxConfig.taxInclusive) {
      // Prices already include tax: back-calculate it for display.
      taxAmount = roundRupiah(base.times(taxRate).dividedBy(taxRate.plus(1)));
      rawTotal = base;
    } else {
      taxAmount = roundRupiah(base.times(taxRate));
      rawTotal = base.plus(taxAmount);
    }

    const grandTotal = ctx.applyCashRounding ? roundToStep(rawTotal, CASH_ROUNDING_STEP) : rawTotal;
    return {
      serviceCharge,
      taxAmount,
      roundingAmount: grandTotal.minus(rawTotal),
      grandTotal,
    };
  }
}

function uniq(values: ReadonlyArray<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === 'string' && v.length > 0))];
}

export function roundToStep(value: MoneyInput, step: number): Prisma.Decimal {
  return money(value).dividedBy(step).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).times(step);
}
