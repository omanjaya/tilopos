import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PromotionRulesEngine,
  type PromotionCartLine,
} from '../../services/promotion-rules.engine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { money, sumMoney } from '@shared/utils/money';

export interface ApplyPromotionParams {
  businessId: string;
  outletId?: string;
  /** `price` is ignored: prices are always loaded from the DB (R8). */
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price?: number;
  }>;
  /** Ignored: the total is computed from server prices. */
  total?: number;
  customerId?: string;
  promotionId?: string;
}

export interface ApplyPromotionResult {
  subtotal: number;
  discount: number;
  total: number;
  appliedPromotion?: {
    id: string;
    name: string;
    description: string | null;
    discountType: 'percentage' | 'fixed' | 'bogo';
    discountValue: number;
  };
  allApplicablePromotions: Array<{
    id: string;
    name: string;
    discountType: 'percentage' | 'fixed' | 'bogo';
    calculatedDiscount: number;
  }>;
}

@Injectable()
export class ApplyPromotionUseCase {
  constructor(
    private readonly promotionRules: PromotionRulesEngine,
    private readonly prisma: PrismaService,
  ) {}

  async execute(params: ApplyPromotionParams): Promise<ApplyPromotionResult> {
    const lines = await this.loadServerPricedLines(params);
    const subtotal = sumMoney(lines.map((l) => money(l.unitPrice).times(l.quantity))).toNumber();

    const result = await this.promotionRules.findApplicablePromotions({
      businessId: params.businessId,
      outletId: params.outletId,
      items: lines,
      customerId: params.customerId,
    });

    if (params.promotionId) {
      const selected = result.applicablePromotions.find((p) => p.id === params.promotionId);
      if (selected) {
        return {
          subtotal,
          discount: selected.calculatedDiscount,
          total: Math.max(0, money(subtotal).minus(selected.calculatedDiscount).toNumber()),
          appliedPromotion: {
            id: selected.id,
            name: selected.name,
            description: selected.description,
            discountType: selected.discountType,
            discountValue: selected.discountValue,
          },
          allApplicablePromotions: result.applicablePromotions.map((p) => ({
            id: p.id,
            name: p.name,
            discountType: p.discountType,
            calculatedDiscount: p.calculatedDiscount,
          })),
        };
      }
    }

    return {
      subtotal,
      discount: result.totalDiscount,
      total: result.finalTotal,
      ...(result.bestPromotion && {
        appliedPromotion: {
          id: result.bestPromotion.id,
          name: result.bestPromotion.name,
          description: result.bestPromotion.description,
          discountType: result.bestPromotion.discountType,
          discountValue: result.bestPromotion.discountValue,
        },
      }),
      allApplicablePromotions: result.applicablePromotions.map((p) => ({
        id: p.id,
        name: p.name,
        discountType: p.discountType,
        calculatedDiscount: p.calculatedDiscount,
      })),
    };
  }

  /** Replaces client prices with product/variant prices of this business. */
  private async loadServerPricedLines(params: ApplyPromotionParams): Promise<PromotionCartLine[]> {
    const productIds = [...new Set(params.items.map((i) => i.productId))];
    const variantIds = [
      ...new Set(params.items.map((i) => i.variantId).filter((v): v is string => !!v)),
    ];
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds }, businessId: params.businessId },
        select: { id: true, basePrice: true, categoryId: true },
      }),
      variantIds.length > 0
        ? this.prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { businessId: params.businessId } },
            select: { id: true, productId: true, price: true },
          })
        : Promise.resolve([]),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const variantById = new Map(variants.map((v) => [v.id, v]));

    return params.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }
      let unitPrice = product.basePrice;
      if (item.variantId) {
        const variant = variantById.get(item.variantId);
        if (!variant || variant.productId !== item.productId) {
          throw new BadRequestException(`Variant ${item.variantId} not found for product`);
        }
        unitPrice = variant.price;
      }
      return {
        productId: item.productId,
        variantId: item.variantId ?? null,
        categoryId: product.categoryId,
        quantity: item.quantity,
        unitPrice,
      };
    });
  }
}
