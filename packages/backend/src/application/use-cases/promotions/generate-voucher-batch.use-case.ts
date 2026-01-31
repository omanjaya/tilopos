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

    const vouchers: GeneratedVoucher[] = [];
    const existingCodes = new Set<string>();

    // Pre-fetch existing codes with the same prefix to avoid collisions
    const existingVouchers = await this.prisma.voucher.findMany({
      where: {
        code: { startsWith: `${params.prefix}-` },
        businessId: params.businessId,
      },
      select: { code: true },
    });
    for (const v of existingVouchers) {
      existingCodes.add(v.code);
    }

    // Generate unique codes
    const codesToCreate: string[] = [];
    let attempts = 0;
    const maxAttempts = params.quantity * 10; // Prevent infinite loops

    while (codesToCreate.length < params.quantity && attempts < maxAttempts) {
      const random = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
      const code = `${params.prefix}-${random}`;

      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        codesToCreate.push(code);
      }
      attempts++;
    }

    if (codesToCreate.length < params.quantity) {
      throw new BadRequestException(
        `Could only generate ${codesToCreate.length} unique codes. Try a different prefix or reduce quantity.`,
      );
    }

    const expiresAt = params.expiresAt ?? null;

    // Batch create vouchers using createMany
    await this.prisma.voucher.createMany({
      data: codesToCreate.map((code) => ({
        businessId: params.businessId,
        promotionId: params.promotionId,
        code,
        expiresAt,
      })),
    });

    for (const code of codesToCreate) {
      vouchers.push({ code, expiresAt });
    }

    return {
      generated: vouchers.length,
      vouchers,
    };
  }
}
