import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType, Prisma, type Promotion } from '@prisma/client';
import type {
  IPromotionRepository,
  CreatePromotionData,
  PromotionRecord,
  VoucherRecord,
} from '../../domain/interfaces/repositories/promotion.repository';
import { PrismaService } from '../database/prisma.service';

/** Upper bound for the unpaginated promotion list (R13). */
const MAX_PROMOTIONS_PER_LIST = 500;

/** The only promotion fields a client may change (R7): never businessId/usedCount/isActive. */
const UPDATABLE_FIELDS = [
  'name',
  'description',
  'discountType',
  'discountValue',
  'minPurchase',
  'maxDiscount',
  'validFrom',
  'validUntil',
  'usageLimit',
  'applicableTo',
] as const;

@Injectable()
export class PrismaPromotionRepository implements IPromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<PromotionRecord[]> {
    const promotions = await this.prisma.promotion.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_PROMOTIONS_PER_LIST,
    });
    return promotions.map((p) => this.toRecord(p));
  }

  /** Pass `businessId` for any client-supplied id (R3). */
  async findById(id: string, businessId?: string): Promise<PromotionRecord | null> {
    const promotion = await this.prisma.promotion.findFirst({
      where: businessId ? { id, businessId } : { id },
    });
    return promotion ? this.toRecord(promotion) : null;
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
        applicableTo: (data.applicableTo ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.toRecord(promotion);
  }

  /**
   * Updates whitelisted fields only; anything else in `data` (businessId, usedCount,
   * isActive, id…) is ignored. Scoped by businessId when given.
   */
  async update(
    id: string,
    data: Record<string, unknown>,
    businessId?: string,
  ): Promise<PromotionRecord> {
    const patch: Prisma.PromotionUpdateManyMutationInput = {};
    const target = patch as Record<string, unknown>;
    for (const key of UPDATABLE_FIELDS) {
      if (data[key] !== undefined) {
        target[key] =
          key === 'discountType'
            ? (data[key] as DiscountType)
            : key === 'applicableTo'
              ? ((data[key] ?? {}) as Prisma.InputJsonValue)
              : data[key];
      }
    }

    const where = businessId ? { id, businessId } : { id };
    const { count } = await this.prisma.promotion.updateMany({ where, data: patch });
    if (count === 0) {
      throw new NotFoundException('Promotion not found');
    }
    const promotion = await this.prisma.promotion.findFirstOrThrow({ where });
    return this.toRecord(promotion);
  }

  async deactivate(id: string, businessId?: string): Promise<void> {
    const { count } = await this.prisma.promotion.updateMany({
      where: businessId ? { id, businessId } : { id },
      data: { isActive: false },
    });
    if (count === 0) {
      throw new NotFoundException('Promotion not found');
    }
  }

  /** Voucher codes are unique per business: always pass businessId. */
  async findVoucherByCode(code: string, businessId?: string): Promise<VoucherRecord | null> {
    const voucher = businessId
      ? await this.prisma.voucher.findUnique({ where: { businessId_code: { businessId, code } } })
      : null;
    if (!voucher) {
      return null;
    }
    return {
      ...voucher,
      initialValue: voucher.initialValue ? voucher.initialValue.toNumber() : null,
      remainingValue: voucher.remainingValue ? voucher.remainingValue.toNumber() : null,
    };
  }

  /** Decimal → number only at the API boundary. */
  private toRecord(p: Promotion): PromotionRecord {
    return {
      ...p,
      discountValue: p.discountValue.toNumber(),
      minPurchase: p.minPurchase ? p.minPurchase.toNumber() : null,
      maxDiscount: p.maxDiscount ? p.maxDiscount.toNumber() : null,
    };
  }
}
