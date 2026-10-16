import { Injectable } from '@nestjs/common';
import { Prisma, type Promotion } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { money, sumMoney, percentOf, minMoney, type MoneyInput } from '@shared/utils/money';

/**
 * A priced cart line. Prices MUST come from the server (DB), never from the
 * client (Docs/ENGINEERING-RULES.md R8).
 */
export interface PromotionCartLine {
  productId: string | null;
  variantId?: string | null;
  /** Filled by the engine from the DB when omitted. */
  categoryId?: string | null;
  quantity: number;
  unitPrice: MoneyInput;
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
  outletId?: string | null;
  items: PromotionCartLine[];
  customerId?: string | null;
  now?: Date;
}

export interface PromotionResult {
  applicablePromotions: ApplicablePromotion[];
  bestPromotion?: ApplicablePromotion;
  totalDiscount: number;
  finalTotal: number;
}

export interface PromotionEvaluation {
  promotion: Promotion;
  discount: Prisma.Decimal;
}

export interface VoucherEvaluation {
  valid: boolean;
  voucherId: string | null;
  promotionId: string | null;
  discountType: 'percentage' | 'fixed' | 'bogo' | null;
  discountValue: number | null;
  maxDiscount: number | null;
  /** Server-computed discount for the given cart (0 when invalid). */
  discount: Prisma.Decimal;
  /** Stored-value (gift) voucher rather than a promotion voucher. */
  storedValue: boolean;
  error?: string;
}

type Db = PrismaService | Prisma.TransactionClient;

interface PreparedContext {
  businessId: string;
  outletId: string | null;
  now: Date;
  lines: Array<Required<Omit<PromotionCartLine, 'variantId'>> & { unit: Prisma.Decimal }>;
  total: Prisma.Decimal;
  customer: { visitCount: number; loyaltyTier: string; customerType: string } | null;
}

interface ApplicableTo {
  outlets?: string[];
  customerSegments?: string[];
  productIds?: string[];
  categoryIds?: string[];
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

function parseApplicableTo(raw: Prisma.JsonValue): ApplicableTo {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    outlets: asStringArray(obj.outlets),
    customerSegments: asStringArray(obj.customerSegments),
    productIds: asStringArray(obj.productIds),
    categoryIds: asStringArray(obj.categoryIds),
  };
}

const floorRupiah = (d: Prisma.Decimal) => d.toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);

/**
 * Server-side promotion and voucher evaluation. Used by the promotions preview
 * endpoint and by checkout (create-transaction / credit sales), so the discount
 * shown is the discount charged.
 */
@Injectable()
export class PromotionRulesEngine {
  constructor(private readonly prisma: PrismaService) {}

  async findApplicablePromotions(context: PromotionRuleContext): Promise<PromotionResult> {
    const ctx = await this.prepare(context);

    const promotions = await this.prisma.promotion.findMany({
      where: {
        businessId: ctx.businessId,
        isActive: true,
        validFrom: { lte: ctx.now },
        validUntil: { gte: ctx.now },
      },
      take: 200,
    });

    const applicable: ApplicablePromotion[] = [];
    for (const promotion of promotions) {
      const discount = this.evaluate(promotion, ctx);
      if (discount && discount.gt(0)) {
        applicable.push(this.toApplicable(promotion, discount));
      }
    }

    applicable.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount);
    const bestPromotion = applicable[0];
    const totalDiscount = bestPromotion?.calculatedDiscount ?? 0;

    return {
      applicablePromotions: applicable,
      bestPromotion,
      totalDiscount,
      finalTotal: Math.max(0, ctx.total.minus(totalDiscount).toNumber()),
    };
  }

  /**
   * Evaluates one promotion (by id, scoped to the business) against the cart.
   * Returns null when the promotion does not exist in this business or does not
   * apply (inactive, outside its period, exhausted, conditions not met).
   */
  async evaluatePromotionById(
    context: PromotionRuleContext,
    promotionId: string,
    db: Db = this.prisma,
  ): Promise<PromotionEvaluation | null> {
    const promotion = await db.promotion.findFirst({
      where: { id: promotionId, businessId: context.businessId },
    });
    if (!promotion) return null;
    const ctx = await this.prepare(context, db);
    const discount = this.evaluate(promotion, ctx);
    return discount && discount.gt(0) ? { promotion, discount } : null;
  }

  /**
   * Validates a voucher code for this business and computes its discount for
   * the cart. Never trusts a client-supplied amount.
   */
  async evaluateVoucher(
    context: PromotionRuleContext,
    code: string,
    db: Db = this.prisma,
  ): Promise<VoucherEvaluation> {
    const invalid = (error: string): VoucherEvaluation => ({
      valid: false,
      voucherId: null,
      promotionId: null,
      discountType: null,
      discountValue: null,
      maxDiscount: null,
      discount: money(0),
      storedValue: false,
      error,
    });

    const normalized = code.trim().toUpperCase();
    if (!normalized) return invalid('Invalid voucher code');

    const voucher = await db.voucher.findFirst({
      where: { code: normalized, businessId: context.businessId, isActive: true },
      include: { promotion: true },
    });
    if (!voucher) return invalid('Invalid voucher code');
    if (voucher.usedAt) return invalid('Voucher already used');

    const ctx = await this.prepare(context, db);
    if (voucher.expiresAt && voucher.expiresAt < ctx.now) return invalid('Voucher expired');

    // Stored-value (gift) voucher
    if (voucher.remainingValue !== null) {
      const remaining = money(voucher.remainingValue);
      if (remaining.lte(0)) return invalid('Voucher has no remaining value');
      return {
        valid: true,
        voucherId: voucher.id,
        promotionId: voucher.promotionId,
        discountType: 'fixed',
        discountValue: remaining.toNumber(),
        maxDiscount: null,
        discount: floorRupiah(minMoney(remaining, ctx.total)),
        storedValue: true,
      };
    }

    if (!voucher.promotion) return invalid('Invalid voucher configuration');
    const promotion = voucher.promotion;
    if (!promotion.isActive) return invalid('Promotion is not active');
    if (promotion.validFrom > ctx.now || promotion.validUntil < ctx.now) {
      return invalid('Promotion not valid at this time');
    }
    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
      return invalid('Promotion usage limit reached');
    }
    const minPurchase = promotion.minPurchase ? money(promotion.minPurchase) : null;
    if (minPurchase && ctx.total.lt(minPurchase)) {
      return invalid(`Minimum purchase of ${minPurchase.toNumber()} required`);
    }

    const discount = this.evaluate(promotion, ctx) ?? money(0);
    if (ctx.lines.length > 0 && discount.lte(0)) {
      return invalid('Voucher is not applicable to this cart');
    }

    return {
      valid: true,
      voucherId: voucher.id,
      promotionId: promotion.id,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue.toNumber(),
      maxDiscount: promotion.maxDiscount ? promotion.maxDiscount.toNumber() : null,
      discount,
      storedValue: false,
    };
  }

  /**
   * Atomically consumes one use of a promotion (tenant-scoped, respects
   * usageLimit under concurrency). Returns false when the promotion is
   * exhausted, inactive or not in this business.
   */
  async incrementUsageCount(db: Db, promotionId: string, businessId: string): Promise<boolean> {
    const count = await db.$executeRaw`
      UPDATE promotions
         SET used_count = used_count + 1, updated_at = now()
       WHERE id = ${promotionId}::uuid
         AND business_id = ${businessId}::uuid
         AND is_active = true
         AND (usage_limit IS NULL OR used_count < usage_limit)
    `;
    return count === 1;
  }

  // ---------------------------------------------------------------------------

  private async prepare(
    context: PromotionRuleContext,
    db: Db = this.prisma,
  ): Promise<PreparedContext> {
    const missingCategory = [
      ...new Set(
        context.items
          .filter((i) => i.productId && i.categoryId === undefined)
          .map((i) => i.productId as string),
      ),
    ];
    const categoryByProduct = new Map<string, string | null>();
    if (missingCategory.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: missingCategory }, businessId: context.businessId },
        select: { id: true, categoryId: true },
      });
      for (const p of products) categoryByProduct.set(p.id, p.categoryId);
    }

    const lines = context.items.map((item) => {
      const unit = money(item.unitPrice);
      return {
        productId: item.productId,
        categoryId:
          item.categoryId !== undefined
            ? item.categoryId
            : item.productId
              ? (categoryByProduct.get(item.productId) ?? null)
              : null,
        quantity: item.quantity,
        unitPrice: unit,
        unit,
      };
    });

    let customer: PreparedContext['customer'] = null;
    if (context.customerId) {
      customer = await db.customer.findFirst({
        where: { id: context.customerId, businessId: context.businessId },
        select: { visitCount: true, loyaltyTier: true, customerType: true },
      });
    }

    return {
      businessId: context.businessId,
      outletId: context.outletId ?? null,
      now: context.now ?? new Date(),
      lines,
      total: sumMoney(lines.map((l) => l.unit.times(l.quantity))),
      customer,
    };
  }

  /** Returns the discount (whole rupiah) or null when not applicable. */
  private evaluate(promotion: Promotion, ctx: PreparedContext): Prisma.Decimal | null {
    if (!promotion.isActive) return null;
    if (promotion.validFrom > ctx.now || promotion.validUntil < ctx.now) return null;
    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) return null;

    const minPurchase = promotion.minPurchase ? money(promotion.minPurchase) : null;
    if (minPurchase && minPurchase.gt(0) && ctx.total.lt(minPurchase)) return null;

    const applicableTo = parseApplicableTo(promotion.applicableTo);

    // Outlet restriction: a missing outlet never matches a restricted promotion.
    if (applicableTo.outlets && applicableTo.outlets.length > 0) {
      if (!ctx.outletId || !applicableTo.outlets.includes(ctx.outletId)) return null;
    }

    // Customer segment restriction: fail closed without a known customer.
    if (applicableTo.customerSegments && applicableTo.customerSegments.length > 0) {
      if (!ctx.customer || !this.matchesSegment(ctx.customer, applicableTo.customerSegments)) {
        return null;
      }
    }

    const productIds = applicableTo.productIds ?? [];
    const categoryIds = applicableTo.categoryIds ?? [];
    const restricted = productIds.length > 0 || categoryIds.length > 0;
    const matching = restricted
      ? ctx.lines.filter(
          (l) =>
            (l.productId !== null && productIds.includes(l.productId)) ||
            (l.categoryId !== null && categoryIds.includes(l.categoryId)),
        )
      : ctx.lines;
    if (restricted && matching.length === 0) return null;

    const base = sumMoney(matching.map((l) => l.unit.times(l.quantity)));
    const value = money(promotion.discountValue);
    let discount: Prisma.Decimal;

    switch (promotion.discountType) {
      case 'percentage':
        discount = percentOf(base, value);
        if (promotion.maxDiscount) discount = minMoney(discount, promotion.maxDiscount);
        break;
      case 'fixed':
        discount = minMoney(value, base);
        break;
      case 'bogo':
        discount = this.bogoDiscount(matching, value);
        break;
      default:
        return null;
    }

    discount = floorRupiah(minMoney(discount, base));
    return discount.gt(0) ? discount : null;
  }

  /**
   * Buy one, get one at `percent`% off: for every two qualifying units the
   * cheaper one is discounted. A single unit never qualifies.
   */
  private bogoDiscount(lines: PreparedContext['lines'], percent: Prisma.Decimal): Prisma.Decimal {
    const units: Prisma.Decimal[] = [];
    for (const line of lines) {
      const whole = Math.floor(line.quantity);
      for (let i = 0; i < whole; i++) units.push(line.unit);
    }
    if (units.length < 2) return money(0);
    units.sort((a, b) => a.comparedTo(b));
    const freeUnits = units.slice(0, Math.floor(units.length / 2));
    return percentOf(sumMoney(freeUnits), percent);
  }

  private matchesSegment(
    customer: NonNullable<PreparedContext['customer']>,
    segments: string[],
  ): boolean {
    const wanted = segments.map((s) => s.toLowerCase());
    const has = (s: string) => wanted.includes(s.toLowerCase());
    if (has('new') && customer.visitCount === 0) return true;
    if (has('returning') && customer.visitCount > 0) return true;
    if (has(customer.loyaltyTier)) return true;
    if (has(customer.customerType)) return true;
    return false;
  }

  private toApplicable(promotion: Promotion, discount: Prisma.Decimal): ApplicablePromotion {
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue.toNumber(),
      calculatedDiscount: discount.toNumber(),
    };
  }
}
