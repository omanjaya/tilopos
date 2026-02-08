import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface CreatePriceTierDto {
  productId: string;
  tierName: string;
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPercent?: number;
}

export interface UpdatePriceTierDto {
  tierName?: string;
  minQuantity?: number;
  maxQuantity?: number | null;
  price?: number;
  discountPercent?: number | null;
  isActive?: boolean;
}

export interface ResolvedPrice {
  unitPrice: number;
  tierName: string | null;
  originalPrice: number;
  savings: number;
  savingsPercent: number;
}

@Injectable()
export class PriceTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProduct(productId: string) {
    return this.prisma.priceTier.findMany({
      where: { productId, isActive: true },
      orderBy: { minQuantity: 'asc' },
    });
  }

  async create(dto: CreatePriceTierDto) {
    return this.prisma.priceTier.create({
      data: {
        productId: dto.productId,
        tierName: dto.tierName,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity ?? null,
        price: dto.price,
        discountPercent: dto.discountPercent ?? null,
      },
    });
  }

  async update(id: string, dto: UpdatePriceTierDto) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException('Price tier not found');

    return this.prisma.priceTier.update({
      where: { id },
      data: {
        tierName: dto.tierName,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        price: dto.price !== undefined ? dto.price : undefined,
        discountPercent: dto.discountPercent,
        isActive: dto.isActive,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.priceTier.delete({ where: { id } });
  }

  async bulkCreateForProduct(
    productId: string,
    tiers: Omit<CreatePriceTierDto, 'productId'>[],
  ) {
    // Delete existing tiers
    await this.prisma.priceTier.deleteMany({ where: { productId } });

    // Create new tiers
    return this.prisma.priceTier.createMany({
      data: tiers.map((t) => ({
        productId,
        tierName: t.tierName,
        minQuantity: t.minQuantity,
        maxQuantity: t.maxQuantity ?? null,
        price: t.price,
        discountPercent: t.discountPercent ?? null,
      })),
    });
  }

  /**
   * Resolve the best price for a product given a quantity.
   * Used by POS during checkout.
   */
  async resolvePrice(productId: string, quantity: number): Promise<ResolvedPrice> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { basePrice: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    const originalPrice = Number(product.basePrice);

    // Find matching tier (highest minQuantity that matches)
    const tiers = await this.prisma.priceTier.findMany({
      where: {
        productId,
        isActive: true,
        minQuantity: { lte: quantity },
      },
      orderBy: { minQuantity: 'desc' },
      take: 1,
    });

    const tier = tiers[0];

    // Check maxQuantity constraint
    if (tier && (tier.maxQuantity === null || quantity <= tier.maxQuantity)) {
      const tierPrice = Number(tier.price);
      const savings = originalPrice - tierPrice;
      const savingsPercent = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;

      return {
        unitPrice: tierPrice,
        tierName: tier.tierName,
        originalPrice,
        savings,
        savingsPercent: Math.round(savingsPercent * 100) / 100,
      };
    }

    return {
      unitPrice: originalPrice,
      tierName: null,
      originalPrice,
      savings: 0,
      savingsPercent: 0,
    };
  }
}
