import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface ValidateVoucherParams {
  code: string;
  businessId: string;
  total: number;
}

export interface ValidateVoucherResult {
  valid: boolean;
  voucherId: string | null;
  promotionId: string | null;
  discountValue: number | null;
  discountType: 'percentage' | 'fixed' | 'bogo' | null;
  error?: string;
}

@Injectable()
export class ValidateVoucherUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: ValidateVoucherParams): Promise<ValidateVoucherResult> {
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code: params.code.toUpperCase(),
        businessId: params.businessId,
        isActive: true,
      },
      include: {
        promotion: true,
      },
    });

    if (!voucher) {
      return {
        valid: false,
        voucherId: null,
        promotionId: null,
        discountValue: null,
        discountType: null,
        error: 'Invalid voucher code',
      };
    }

    if (voucher.usedAt) {
      return {
        valid: false,
        voucherId: null,
        promotionId: null,
        discountValue: null,
        discountType: null,
        error: 'Voucher already used',
      };
    }

    if (voucher.expiresAt && voucher.expiresAt < new Date()) {
      return {
        valid: false,
        voucherId: null,
        promotionId: null,
        discountValue: null,
        discountType: null,
        error: 'Voucher expired',
      };
    }

    // Check if voucher has remaining value (for gift cards)
    if (voucher.remainingValue) {
      const remaining = voucher.remainingValue.toNumber();
      if (remaining <= 0) {
        return {
          valid: false,
          voucherId: null,
          promotionId: null,
          discountValue: null,
          discountType: null,
          error: 'Voucher has no remaining value',
        };
      }

      return {
        valid: true,
        voucherId: voucher.id,
        promotionId: voucher.promotionId,
        discountValue: remaining,
        discountType: 'fixed',
      };
    }

    // Check if voucher is linked to a promotion
    if (voucher.promotion) {
      const now = new Date();
      if (voucher.promotion.validFrom > now || voucher.promotion.validUntil < now) {
        return {
          valid: false,
          voucherId: null,
          promotionId: null,
          discountValue: null,
          discountType: null,
          error: 'Promotion not valid at this time',
        };
      }

      const minPurchase = voucher.promotion.minPurchase?.toNumber();
      if (minPurchase && params.total < minPurchase) {
        return {
          valid: false,
          voucherId: null,
          promotionId: null,
          discountValue: null,
          discountType: null,
          error: `Minimum purchase of ${minPurchase} required`,
        };
      }

      return {
        valid: true,
        voucherId: voucher.id,
        promotionId: voucher.promotion.id,
        discountValue: voucher.promotion.discountValue.toNumber(),
        discountType: voucher.promotion.discountType,
      };
    }

    return {
      valid: false,
      voucherId: null,
      promotionId: null,
      discountValue: null,
      discountType: null,
      error: 'Invalid voucher configuration',
    };
  }

  async markVoucherAsUsed(voucherId: string, customerId: string): Promise<void> {
    await this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        usedAt: new Date(),
        usedBy: customerId,
      },
    });
  }
}
