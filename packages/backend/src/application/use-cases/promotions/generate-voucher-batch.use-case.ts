import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface GenerateVoucherBatchParams {
  businessId: string;
  promotionId: string;
  prefix: string;
  quantity: number;
  expiresAt?: Date;
}

export interface GeneratedVoucher {
  code: string;
  expiresAt: Date | null;
}

export interface GenerateVoucherBatchResult {
  generated: number;
  vouchers: GeneratedVoucher[];
}

@Injectable()
export class GenerateVoucherBatchUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GenerateVoucherBatchParams): Promise<GenerateVoucherBatchResult> {
    // Validate promotion exists and belongs to business
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        id: params.promotionId,
        businessId: params.businessId,
      },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (!promotion.isActive) {
      throw new BadRequestException('Cannot generate vouchers for an inactive promotion');
    }

    // Codes are looked up upper-cased (see PromotionRulesEngine.evaluateVoucher).
    const prefix = params.prefix.trim().toUpperCase();
    const expiresAt = params.expiresAt ?? null;
    const created: string[] = [];

    // Codes are unique per business (uq_voucher_business_code). Generate, insert with
    // skipDuplicates and top up whatever collided (e.g. a concurrent batch) - R15.
    for (let round = 0; round < 5 && created.length < params.quantity; round++) {
      const needed = params.quantity - created.length;
      const candidates = new Set<string>();
      let attempts = 0;
      while (candidates.size < needed && attempts < needed * 10) {
        candidates.add(`${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`);
        attempts++;
      }
      const codes = [...candidates];

      const existing = await this.prisma.voucher.findMany({
        where: { businessId: params.businessId, code: { in: codes } },
        select: { code: true },
      });
      const taken = new Set(existing.map((v) => v.code));
      const fresh = codes.filter((c) => !taken.has(c));
      if (fresh.length === 0) continue;

      await this.prisma.voucher.createMany({
        data: fresh.map((code) => ({
          businessId: params.businessId,
          promotionId: params.promotionId,
          code,
          expiresAt,
        })),
        skipDuplicates: true,
      });

      // Re-read which of our codes now belong to this promotion (skipDuplicates hides collisions).
      const inserted = await this.prisma.voucher.findMany({
        where: {
          businessId: params.businessId,
          promotionId: params.promotionId,
          code: { in: fresh },
        },
        select: { code: true },
      });
      created.push(...inserted.map((v) => v.code));
    }

    if (created.length < params.quantity) {
      throw new BadRequestException(
        `Could only generate ${created.length} unique codes. Try a different prefix or reduce quantity.`,
      );
    }

    const vouchers: GeneratedVoucher[] = created.map((code) => ({ code, expiresAt }));

    return {
      generated: vouchers.length,
      vouchers,
    };
  }
}
