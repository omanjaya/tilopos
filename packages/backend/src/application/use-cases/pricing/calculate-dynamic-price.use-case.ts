import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPricingRuleRepository } from '../../repositories/pricing-rule.repository';
import {
  PricingCalculatorService,
  PricingContext,
  PricingResult,
} from '../../../domain/services/pricing-calculator.service';
import { Money } from '../../../domain/value-objects/money';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { money, sumMoney } from '@shared/utils/money';

/**
 * Price preview input. Only ids come from the client; price, category, stock
 * and customer segment are loaded from the DB, scoped to the business (R3/R8).
 * `outletId` must already be verified by the caller (TenantAccessService).
 */
export interface CalculatePriceInput {
  businessId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  outletId?: string | null;
  customerId?: string;
  /** Preview hints for cart-level rule conditions. */
  cartTotal?: number;
  cartItemCount?: number;
}

export interface CalculateBatchPriceInput {
  businessId: string;
  items: { productId: string; variantId?: string; quantity: number }[];
  outletId?: string | null;
  customerId?: string;
}

export interface BatchPriceResult {
  index: number;
  productId: string;
  variantId?: string;
  result: PricingResult;
}

interface LoadedItem {
  productId: string;
  variantId?: string;
  categoryId?: string;
  quantity: number;
  price: number;
  stockLevel?: number;
}

@Injectable()
export class CalculateDynamicPriceUseCase {
  constructor(
    @Inject('IPricingRuleRepository')
    private readonly pricingRuleRepository: IPricingRuleRepository,
    private readonly pricingCalculator: PricingCalculatorService,
    private readonly prisma: PrismaService,
  ) {}

  /** Calculate dynamic price for a single product. */
  async execute(input: CalculatePriceInput): Promise<PricingResult> {
    const { context, rules } = await this.prepareSingle(input);
    return this.pricingCalculator.calculatePrice(context, rules);
  }

  /**
   * Calculate dynamic prices for multiple products. Results are returned per
   * input line (duplicates of the same product do not collapse).
   */
  async executeBatch(input: CalculateBatchPriceInput): Promise<BatchPriceResult[]> {
    const [items, segment] = await Promise.all([
      this.loadItems(input.businessId, input.items, input.outletId),
      this.loadSegment(input.businessId, input.customerId),
    ]);
    const categoryIds = [
      ...new Set(items.map((i) => i.categoryId).filter((c): c is string => !!c)),
    ];

    const rules = await this.pricingRuleRepository.findAll({
      businessId: input.businessId,
      productIds: [...new Set(items.map((i) => i.productId))],
      categoryIds,
      status: 'active',
      activeAt: new Date(),
    });

    const cartTotal = sumMoney(items.map((i) => money(i.price).times(i.quantity))).toNumber();
    const cartItemCount = items.reduce((n, i) => n + i.quantity, 0);
    const now = new Date();
    const applications = new Map<string, number>();

    return items.map((item, index) => ({
      index,
      productId: item.productId,
      variantId: item.variantId,
      result: this.pricingCalculator.calculatePrice(
        {
          productId: item.productId,
          categoryId: item.categoryId,
          quantity: item.quantity,
          originalPrice: Money.create(item.price),
          customerSegment: segment,
          currentTime: now,
          stockLevel: item.stockLevel,
          cartTotal,
          cartItemCount,
        },
        rules,
        applications,
      ),
    }));
  }

  /** Preview applicable rules without calculating price. */
  async previewRules(input: CalculatePriceInput) {
    const { context, rules } = await this.prepareSingle(input);
    return this.pricingCalculator.previewApplicableRules(context, rules);
  }

  /** Potential savings if the customer adds more items. */
  async getPotentialSavings(input: CalculatePriceInput) {
    const { context, rules } = await this.prepareSingle(input);
    return this.pricingCalculator.calculatePotentialSavings(context, rules);
  }

  // ---------------------------------------------------------------------------

  private async prepareSingle(input: CalculatePriceInput) {
    const [[item], segment] = await Promise.all([
      this.loadItems(
        input.businessId,
        [{ productId: input.productId, variantId: input.variantId, quantity: input.quantity }],
        input.outletId,
      ),
      this.loadSegment(input.businessId, input.customerId),
    ]);

    const rules = await this.pricingRuleRepository.findActiveForProduct(
      input.businessId,
      item.productId,
      item.categoryId,
    );

    const context: PricingContext = {
      productId: item.productId,
      categoryId: item.categoryId,
      quantity: item.quantity,
      originalPrice: Money.create(item.price),
      customerSegment: segment,
      currentTime: new Date(),
      stockLevel: item.stockLevel,
      cartTotal: input.cartTotal ?? money(item.price).times(item.quantity).toNumber(),
      cartItemCount: input.cartItemCount ?? item.quantity,
    };
    return { context, rules };
  }

  private async loadItems(
    businessId: string,
    items: { productId: string; variantId?: string; quantity: number }[],
    outletId?: string | null,
  ): Promise<LoadedItem[]> {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const variantIds = [...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v))];

    const [products, variants, stock] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true, basePrice: true, categoryId: true },
      }),
      variantIds.length
        ? this.prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { businessId } },
            select: { id: true, productId: true, price: true },
          })
        : Promise.resolve([]),
      outletId
        ? this.prisma.stockLevel.findMany({
            where: { outletId, productId: { in: productIds } },
            select: { productId: true, variantId: true, quantity: true },
          })
        : Promise.resolve([]),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const variantById = new Map(variants.map((v) => [v.id, v]));
    const stockByKey = new Map(
      stock.map((s) => [`${s.productId}:${s.variantId ?? ''}`, money(s.quantity).toNumber()]),
    );

    return items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      let price = money(product.basePrice);
      if (item.variantId) {
        const variant = variantById.get(item.variantId);
        if (!variant || variant.productId !== item.productId) {
          throw new NotFoundException(`Variant ${item.variantId} not found for product`);
        }
        price = money(variant.price);
      }
      return {
        productId: item.productId,
        variantId: item.variantId,
        categoryId: product.categoryId ?? undefined,
        quantity: item.quantity,
        price: price.toNumber(),
        stockLevel: outletId
          ? stockByKey.get(`${item.productId}:${item.variantId ?? ''}`)
          : undefined,
      };
    });
  }

  private async loadSegment(businessId: string, customerId?: string): Promise<string | undefined> {
    if (!customerId) return undefined;
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
      select: { loyaltyTier: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer.loyaltyTier;
  }
}
