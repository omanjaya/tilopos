import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PromotionRulesEngine } from '../../services/promotion-rules.engine';

export interface ValidateVoucherParams {
  code: string;
  businessId: string;
  /** Cart subtotal used for the minimum-purchase check and discount preview. */
  total: number;
  outletId?: string | null;
  customerId?: string | null;
}

export interface ValidateVoucherResult {
  valid: boolean;
  voucherId: string | null;
  promotionId: string | null;
  discountValue: number | null;
  discountType: 'percentage' | 'fixed' | 'bogo' | null;
  /** Cap for percentage vouchers (null = uncapped). */
  maxDiscount: number | null;
  /** Discount the server will grant for `total` (preview only; checkout recomputes it). */
  discountAmount: number;
  error?: string;
}

@Injectable()
export class ValidateVoucherUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: PromotionRulesEngine,
  ) {}

  async execute(params: ValidateVoucherParams): Promise<ValidateVoucherResult> {
    // The preview has no line items, so product/category-restricted vouchers are
    // evaluated against the whole amount here; checkout re-evaluates on real lines.
    const result = await this.rules.evaluateVoucher(
      {
        businessId: params.businessId,
        outletId: params.outletId ?? null,
        customerId: params.customerId ?? null,
        items: [{ productId: null, categoryId: null, quantity: 1, unitPrice: params.total }],
      },
      params.code,
    );

    return {
      valid: result.valid,
      voucherId: result.voucherId,
      promotionId: result.promotionId,
      discountValue: result.discountValue,
      discountType: result.discountType,
      maxDiscount: result.maxDiscount,
      discountAmount: result.discount.toNumber(),
      ...(result.error ? { error: result.error } : {}),
    };
  }

  /**
   * Marks a voucher as redeemed exactly once (conditional update, R9) and
   * consumes one use of its promotion in the same transaction.
   */
  async markVoucherAsUsed(
    voucherId: string,
    customerId: string | null,
    businessId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findFirst({
        where: { id: voucherId, businessId },
        select: { id: true, promotionId: true },
      });
      if (!voucher) {
        throw new NotFoundException('Voucher not found');
      }
      if (customerId) {
        const customer = await tx.customer.count({ where: { id: customerId, businessId } });
        if (customer === 0) throw new NotFoundException('Customer not found');
      }

      const { count } = await tx.voucher.updateMany({
        where: { id: voucherId, businessId, usedAt: null, isActive: true },
        data: { usedAt: new Date(), usedBy: customerId },
      });
      if (count !== 1) {
        throw new ConflictException('Voucher already used or inactive');
      }

      if (voucher.promotionId) {
        const ok = await this.rules.incrementUsageCount(tx, voucher.promotionId, businessId);
        if (!ok) throw new ConflictException('Promotion usage limit reached');
      }
    });
  }
}
