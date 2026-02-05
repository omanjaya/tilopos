import { Injectable } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import type {
  IPromotionRepository,
  CreatePromotionData,
  PromotionRecord,
  VoucherRecord,
} from '../../domain/interfaces/repositories/promotion.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaPromotionRepository implements IPromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<PromotionRecord[]> {
    const promotions = await this.prisma.promotion.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => ({
      ...p,
      discountValue: p.discountValue.toNumber(),
      minPurchase: p.minPurchase ? p.minPurchase.toNumber() : null,
      maxDiscount: p.maxDiscount ? p.maxDiscount.toNumber() : null,
    }));
  }

  async findById(id: string): Promise<PromotionRecord | null> {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });

    if (!promotion) {
      return null;
    }

    return {
      ...promotion,
      discountValue: promotion.discountValue.toNumber(),
      minPurchase: promotion.minPurchase ? promotion.minPurchase.toNumber() : null,
      maxDiscount: promotion.maxDiscount ? promotion.maxDiscount.toNumber() : null,
    };
  }

  async save(data: CreatePromotionData): Promise<PromotionRecord> {
    const promotion = await this.prisma.promotion.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        description: data.description,
        discountType: data.discountType as DiscountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase,
        maxDiscount: data.maxDiscount,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        usageLimit: data.usageLimit,
      },
    });

    return {
      ...promotion,
      discountValue: promotion.discountValue.toNumber(),
      minPurchase: promotion.minPurchase ? promotion.minPurchase.toNumber() : null,
      maxDiscount: promotion.maxDiscount ? promotion.maxDiscount.toNumber() : null,
    };
  }

  async update(id: string, data: Record<string, unknown>): Promise<PromotionRecord> {
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: data as Record<string, never>,
    });

    return {
      ...promotion,
      discountValue: promotion.discountValue.toNumber(),
      minPurchase: promotion.minPurchase ? promotion.minPurchase.toNumber() : null,
      maxDiscount: promotion.maxDiscount ? promotion.maxDiscount.toNumber() : null,
    };
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.promotion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findVoucherByCode(code: string): Promise<VoucherRecord | null> {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });

    if (!voucher) {
      return null;
    }

    return {
      ...voucher,
      initialValue: voucher.initialValue ? voucher.initialValue.toNumber() : null,
      remainingValue: voucher.remainingValue ? voucher.remainingValue.toNumber() : null,
    };
  }
}
