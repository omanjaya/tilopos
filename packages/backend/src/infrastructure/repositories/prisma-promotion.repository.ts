import { Injectable } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import type { IPromotionRepository, CreatePromotionData } from '../../domain/interfaces/repositories/promotion.repository';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PrismaPromotionRepository implements IPromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<any[]> {
    return this.prisma.promotion.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.promotion.findUnique({ where: { id } });
  }

  async save(data: CreatePromotionData): Promise<any> {
    return this.prisma.promotion.create({
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
  }

  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.promotion.update({
      where: { id },
      data: data as Record<string, never>,
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.promotion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findVoucherByCode(code: string): Promise<any | null> {
    return this.prisma.voucher.findUnique({ where: { code } });
  }
}
