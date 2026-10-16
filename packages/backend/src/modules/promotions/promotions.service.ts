import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { PrismaPromotionRepository } from '../../infrastructure/repositories/prisma-promotion.repository';
import type { PromotionRecord } from '../../domain/interfaces/repositories/promotion.repository';
import { toNumber } from '../../shared/utils/money';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import type {
  CreatePromotionDto,
  GenerateVouchersDto,
  UpdatePromotionDto,
} from '../../application/dtos/promotion.dto';

/** Max vouchers returned by the list endpoint / exported to CSV (R13). */
export const MAX_VOUCHER_LIST = 500;
export const MAX_VOUCHER_EXPORT = 20_000;

export interface VoucherView {
  id: string;
  code: string;
  prefix: string;
  discountType: string;
  discountValue: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

/** Cross-field rules shared by create and update. */
export function assertPromotionConsistent(p: {
  discountType: string;
  discountValue: number;
  validFrom: Date;
  validUntil: Date;
}): void {
  if (isNaN(p.validFrom.getTime()) || isNaN(p.validUntil.getTime())) {
    throw new BadRequestException('validFrom/validUntil must be valid dates');
  }
  if (p.validUntil <= p.validFrom) {
    throw new BadRequestException('validUntil must be after validFrom');
  }
  if (p.discountType === 'percentage' && p.discountValue > 100) {
    throw new BadRequestException('Percentage discount cannot exceed 100');
  }
}

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REPOSITORY_TOKENS.PROMOTION)
    private readonly promotionRepo: PrismaPromotionRepository,
    private readonly tenant: TenantAccessService,
  ) {}

  list(businessId: string): Promise<PromotionRecord[]> {
    return this.promotionRepo.findByBusinessId(businessId);
  }

  async findOne(businessId: string, id: string): Promise<PromotionRecord> {
    const promotion = await this.promotionRepo.findById(id, businessId);
    if (!promotion) throw new NotFoundException('Promotion not found');
    return promotion;
  }

  async create(businessId: string, dto: CreatePromotionDto): Promise<PromotionRecord> {
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    assertPromotionConsistent({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      validFrom,
      validUntil,
    });
    await this.assertApplicableToOwned(businessId, dto.applicableTo);

    return this.promotionRepo.save({
      businessId,
      name: dto.name,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minPurchase: dto.minPurchase ?? null,
      maxDiscount: dto.maxDiscount ?? null,
      validFrom,
      validUntil,
      usageLimit: dto.usageLimit ?? null,
      applicableTo: dto.applicableTo ? { ...dto.applicableTo } : {},
    });
  }

  /** Explicit field mapping (R7): businessId/usedCount/isActive can never be set. */
  async update(businessId: string, id: string, dto: UpdatePromotionDto): Promise<PromotionRecord> {
    const current = await this.findOne(businessId, id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.validFrom !== undefined) data.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined) data.validUntil = new Date(dto.validUntil);
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.applicableTo !== undefined) {
      await this.assertApplicableToOwned(businessId, dto.applicableTo);
      data.applicableTo = { ...dto.applicableTo };
    }

    assertPromotionConsistent({
      discountType: dto.discountType ?? current.discountType,
      discountValue: dto.discountValue ?? current.discountValue,
      validFrom: (data.validFrom as Date | undefined) ?? current.validFrom,
      validUntil: (data.validUntil as Date | undefined) ?? current.validUntil,
    });

    return this.promotionRepo.update(id, data, businessId);
  }

  deactivate(businessId: string, id: string): Promise<void> {
    return this.promotionRepo.deactivate(id, businessId);
  }

  // ==================== Vouchers ====================

  async listVouchers(businessId: string, search?: string): Promise<VoucherView[]> {
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        businessId,
        ...(search ? { code: { contains: search.trim(), mode: 'insensitive' } } : {}),
      },
      include: { promotion: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_VOUCHER_LIST,
    });
    return vouchers.map((v) => this.toVoucherView(v));
  }

  /**
   * Creates the parent promotion and its single-use voucher codes in one DB
   * transaction, so a failure never leaves an orphan (auto-applied) promotion.
   * Codes are unique per business (@@unique[businessId, code]); collisions are
   * retried and a short batch is an error, never a silent partial result.
   */
  async generateVouchers(businessId: string, dto: GenerateVouchersDto): Promise<VoucherView[]> {
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validTo);
    assertPromotionConsistent({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      validFrom,
      validUntil,
    });

    return this.prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({
        data: {
          businessId,
          name: `Voucher ${dto.prefix}`,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          validFrom,
          validUntil,
          usageLimit: dto.usageLimit,
          applicableTo: {},
        },
      });

      const codes = new Set<string>();
      for (let attempt = 0; attempt < 5 && codes.size < dto.quantity; attempt++) {
        const candidates = new Set<string>();
        while (candidates.size < (dto.quantity - codes.size) * 2) {
          candidates.add(`${dto.prefix}-${randomBytes(4).toString('hex').toUpperCase()}`);
        }
        const taken = await tx.voucher.findMany({
          where: { businessId, code: { in: [...candidates] } },
          select: { code: true },
        });
        const takenSet = new Set(taken.map((t) => t.code));
        for (const code of candidates) {
          if (codes.size >= dto.quantity) break;
          if (!takenSet.has(code)) codes.add(code);
        }
      }
      if (codes.size < dto.quantity) {
        throw new ConflictException('Could not generate enough unique voucher codes, try again');
      }

      const { count } = await tx.voucher.createMany({
        data: [...codes].map((code) => ({
          businessId,
          promotionId: promotion.id,
          code,
          expiresAt: validUntil,
        })),
      });
      if (count !== codes.size) {
        throw new ConflictException('Voucher code collision, try again');
      }

      const created = await tx.voucher.findMany({
        where: { businessId, promotionId: promotion.id },
        include: { promotion: true },
        orderBy: { code: 'asc' },
      });
      return created.map((v) => this.toVoucherView(v));
    });
  }

  async exportVouchersCsv(businessId: string): Promise<string> {
    const vouchers = await this.prisma.voucher.findMany({
      where: { businessId },
      include: { promotion: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_VOUCHER_EXPORT,
    });

    const header = 'Code,Discount Type,Discount Value,Valid From,Valid To,Used,Active,Created At';
    const rows = vouchers.map((v) => {
      const view = this.toVoucherView(v);
      return [
        csvCell(view.code),
        view.discountType,
        String(view.discountValue),
        v.promotion?.validFrom?.toISOString() ?? '',
        view.validTo,
        v.usedAt ? 'Yes' : 'No',
        v.isActive ? 'Yes' : 'No',
        view.createdAt,
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }

  private toVoucherView(
    v: Prisma.VoucherGetPayload<{ include: { promotion: true } }>,
  ): VoucherView {
    const promo = v.promotion;
    return {
      id: v.id,
      code: v.code,
      prefix: v.code.split('-')[0] || v.code,
      discountType: promo?.discountType ?? 'fixed',
      discountValue: promo ? toNumber(promo.discountValue) : toNumber(v.initialValue),
      validFrom: promo?.validFrom?.toISOString() ?? v.createdAt.toISOString(),
      validTo:
        promo?.validUntil?.toISOString() ?? v.expiresAt?.toISOString() ?? v.createdAt.toISOString(),
      usageLimit: 1,
      usageCount: v.usedAt ? 1 : 0,
      isActive: v.isActive,
      createdAt: v.createdAt.toISOString(),
    };
  }

  /** Outlet/product/category ids inside applicableTo must belong to the tenant (R3). */
  private async assertApplicableToOwned(
    businessId: string,
    applicableTo?: { outlets?: string[]; productIds?: string[]; categoryIds?: string[] },
  ): Promise<void> {
    if (!applicableTo) return;
    await this.tenant.assertOwned('outlet', applicableTo.outlets, businessId);
    await this.tenant.assertOwned('product', applicableTo.productIds, businessId);
    await this.tenant.assertOwned('category', applicableTo.categoryIds, businessId);
  }
}

/** CSV cell with formula-injection neutralisation. */
function csvCell(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
