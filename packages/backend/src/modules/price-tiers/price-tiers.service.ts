import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { money, toNumber } from '@shared/utils/money';
import type { CreatePriceTierDto, PriceTierFieldsDto, UpdatePriceTierDto } from './price-tiers.dto';

export interface ResolvedPrice {
  unitPrice: number;
  tierName: string | null;
  originalPrice: number;
  savings: number;
  savingsPercent: number;
}

function assertRange(min: number, max: number | null | undefined): void {
  if (max !== null && max !== undefined && max < min) {
    throw new BadRequestException('maxQuantity must be greater than or equal to minQuantity');
  }
}

/**
 * Quantity price tiers. Every method is scoped to the caller's business through
 * the product relation (R3), so the service is safe to reuse from other modules.
 */
@Injectable()
export class PriceTiersService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProduct(businessId: string, productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
  }

  async findById(businessId: string, id: string) {
    const tier = await this.prisma.priceTier.findFirst({
      where: { id, product: { businessId } },
    });
    if (!tier) throw new NotFoundException('Price tier not found');
    return tier;
  }

  async listByProduct(businessId: string, productId: string) {
    await this.assertProduct(businessId, productId);
    return this.prisma.priceTier.findMany({
      where: { productId, product: { businessId }, isActive: true },
      orderBy: { minQuantity: 'asc' },
      take: 100,
    });
  }

  async create(businessId: string, dto: CreatePriceTierDto) {
    assertRange(dto.minQuantity, dto.maxQuantity);
    await this.assertProduct(businessId, dto.productId);
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

  async update(businessId: string, id: string, dto: UpdatePriceTierDto) {
    const current = await this.findById(businessId, id);
    assertRange(
      dto.minQuantity ?? current.minQuantity,
      dto.maxQuantity === undefined ? current.maxQuantity : dto.maxQuantity,
    );

    const data: Prisma.PriceTierUpdateManyMutationInput = {};
    if (dto.tierName !== undefined) data.tierName = dto.tierName;
    if (dto.minQuantity !== undefined) data.minQuantity = dto.minQuantity;
    if (dto.maxQuantity !== undefined) data.maxQuantity = dto.maxQuantity;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.discountPercent !== undefined) data.discountPercent = dto.discountPercent;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const { count } = await this.prisma.priceTier.updateMany({
      where: { id, product: { businessId } },
      data,
    });
    if (count === 0) throw new NotFoundException('Price tier not found');
    return this.findById(businessId, id);
  }

  async delete(businessId: string, id: string): Promise<void> {
    const { count } = await this.prisma.priceTier.deleteMany({
      where: { id, product: { businessId } },
    });
    if (count === 0) throw new NotFoundException('Price tier not found');
  }

  /** Replaces all tiers of a product atomically (delete + create in one transaction). */
  async bulkCreateForProduct(businessId: string, productId: string, tiers: PriceTierFieldsDto[]) {
    tiers.forEach((t) => assertRange(t.minQuantity, t.maxQuantity));
    await this.assertProduct(businessId, productId);

    return this.prisma.$transaction(async (tx) => {
      await tx.priceTier.deleteMany({ where: { productId, product: { businessId } } });
      return tx.priceTier.createMany({
        data: tiers.map((t) => ({
          productId,
          tierName: t.tierName,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity ?? null,
          price: t.price,
          discountPercent: t.discountPercent ?? null,
        })),
      });
    });
  }

  /** Best unit price for a quantity (Decimal arithmetic, R8). */
  async resolvePrice(
    businessId: string,
    productId: string,
    quantity: number,
  ): Promise<ResolvedPrice> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      select: { basePrice: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const original = money(product.basePrice);
    const tier = await this.prisma.priceTier.findFirst({
      where: { productId, product: { businessId }, isActive: true, minQuantity: { lte: quantity } },
      orderBy: { minQuantity: 'desc' },
    });

    if (tier && (tier.maxQuantity === null || quantity <= tier.maxQuantity)) {
      const tierPrice = money(tier.price);
      const savings = original.minus(tierPrice);
      const savingsPercent = original.gt(0)
        ? savings.dividedBy(original).times(100).toDecimalPlaces(2)
        : money(0);
      return {
        unitPrice: toNumber(tierPrice),
        tierName: tier.tierName,
        originalPrice: toNumber(original),
        savings: toNumber(savings),
        savingsPercent: toNumber(savingsPercent),
      };
    }

    return {
      unitPrice: toNumber(original),
      tierName: null,
      originalPrice: toNumber(original),
      savings: 0,
      savingsPercent: 0,
    };
  }
}
