import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  IPricingRuleRepository,
  FindPricingRulesOptions,
} from '../../application/repositories/pricing-rule.repository';
import {
  PricingRule,
  PricingRuleType,
  PricingRuleStatus,
  DiscountType,
  PricingConditions,
} from '../../domain/entities/pricing-rule.entity';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/constants/error-codes';

/** Upper bound of rules loaded per query (R13). */
const MAX_RULES = 500;

type PricingRuleRecord = {
  id: string;
  businessId: string;
  name: string;
  type: string;
  priority: number;
  status: string;
  validFrom: Date;
  validUntil: Date | null;
  conditions: unknown;
  discountType: string;
  discountValue: unknown;
  minQuantity: number | null;
  maxQuantity: number | null;
  applicableDays: number[];
  timeFrom: string | null;
  timeUntil: string | null;
  customerSegments: string[];
  productIds: string[];
  categoryIds: string[];
  excludeProductIds: string[];
  isCombinable: boolean;
  maxApplicationsPerTransaction: number | null;
  description: string | null;
};

@Injectable()
export class PrismaPricingRuleRepository implements IPricingRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, businessId: string): Promise<PricingRule | null> {
    const record = await this.prisma.pricingRule.findFirst({
      where: { id, businessId },
    });

    return record ? this.toDomain(record) : null;
  }

  async findAll(options: FindPricingRulesOptions): Promise<PricingRule[]> {
    // Every optional filter is its own AND clause so they never overwrite each other.
    const and: Prisma.PricingRuleWhereInput[] = [];

    if (options.activeAt) {
      and.push({ validFrom: { lte: options.activeAt } });
      and.push({ OR: [{ validUntil: null }, { validUntil: { gte: options.activeAt } }] });
    }

    const productIds = options.productIds ?? [];
    const categoryIds = options.categoryIds ?? [];
    if (productIds.length > 0 || categoryIds.length > 0) {
      // A rule matches when it targets one of the products or categories, or targets
      // neither (applies to everything). Final product/category matching happens in
      // PricingRule.appliesTo.
      and.push({
        OR: [
          ...(productIds.length > 0 ? [{ productIds: { hasSome: productIds } }] : []),
          ...(categoryIds.length > 0 ? [{ categoryIds: { hasSome: categoryIds } }] : []),
          { AND: [{ productIds: { isEmpty: true } }, { categoryIds: { isEmpty: true } }] },
        ],
      });
    }

    const records = await this.prisma.pricingRule.findMany({
      where: {
        businessId: options.businessId,
        ...(options.type ? { type: options.type as PricingRuleType } : {}),
        ...(options.status ? { status: options.status as PricingRuleStatus } : {}),
        ...(and.length > 0 ? { AND: and } : {}),
      },
      orderBy: { priority: 'desc' },
      take: MAX_RULES,
    });

    return records.map((record: PricingRuleRecord) => this.toDomain(record));
  }

  async findActiveForProduct(
    businessId: string,
    productId: string,
    categoryId?: string,
  ): Promise<PricingRule[]> {
    const rules = await this.findAll({
      businessId,
      status: 'active',
      activeAt: new Date(),
      productIds: [productId],
      categoryIds: categoryId ? [categoryId] : [],
    });
    return rules.filter((rule: PricingRule) => rule.appliesTo(productId, categoryId));
  }

  async create(rule: PricingRule): Promise<PricingRule> {
    const record = await this.prisma.pricingRule.create({
      data: {
        id: rule.id,
        businessId: rule.businessId,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        priority: rule.priority,
        status: rule.status,
        validFrom: rule.validFrom,
        validUntil: rule.validUntil,
        conditions: rule.conditions as object,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        minQuantity: rule.minQuantity,
        maxQuantity: rule.maxQuantity,
        applicableDays: rule.applicableDays,
        timeFrom: rule.timeFrom,
        timeUntil: rule.timeUntil,
        customerSegments: rule.customerSegments,
        productIds: rule.productIds,
        categoryIds: rule.categoryIds,
        excludeProductIds: rule.excludeProductIds,
        isCombinable: rule.isCombinable,
        maxApplicationsPerTransaction: rule.maxApplicationsPerTransaction,
      },
    });

    return this.toDomain(record);
  }

  async update(
    id: string,
    businessId: string,
    updates: Partial<PricingRule>,
  ): Promise<PricingRule> {
    const data: Record<string, unknown> = {};

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.validFrom !== undefined) data.validFrom = updates.validFrom;
    if (updates.validUntil !== undefined) data.validUntil = updates.validUntil;
    if (updates.conditions !== undefined) data.conditions = updates.conditions as object;
    if (updates.discountType !== undefined) data.discountType = updates.discountType;
    if (updates.discountValue !== undefined) data.discountValue = updates.discountValue;
    if (updates.minQuantity !== undefined) data.minQuantity = updates.minQuantity;
    if (updates.maxQuantity !== undefined) data.maxQuantity = updates.maxQuantity;
    if (updates.applicableDays !== undefined) data.applicableDays = updates.applicableDays;
    if (updates.timeFrom !== undefined) data.timeFrom = updates.timeFrom;
    if (updates.timeUntil !== undefined) data.timeUntil = updates.timeUntil;
    if (updates.customerSegments !== undefined) data.customerSegments = updates.customerSegments;
    if (updates.productIds !== undefined) data.productIds = updates.productIds;
    if (updates.categoryIds !== undefined) data.categoryIds = updates.categoryIds;
    if (updates.excludeProductIds !== undefined) data.excludeProductIds = updates.excludeProductIds;
    if (updates.isCombinable !== undefined) data.isCombinable = updates.isCombinable;
    if (updates.maxApplicationsPerTransaction !== undefined) {
      data.maxApplicationsPerTransaction = updates.maxApplicationsPerTransaction;
    }

    const { count } = await this.prisma.pricingRule.updateMany({
      where: { id, businessId },
      data,
    });
    if (count === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }

    const updated = await this.findById(id, businessId);
    if (!updated) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }
    return updated;
  }

  async delete(id: string, businessId: string): Promise<void> {
    const { count } = await this.prisma.pricingRule.deleteMany({
      where: { id, businessId },
    });
    if (count === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }
  }

  async updateStatus(id: string, businessId: string, status: string): Promise<void> {
    const { count } = await this.prisma.pricingRule.updateMany({
      where: { id, businessId },
      data: { status: status as PricingRuleStatus },
    });
    if (count === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }
  }

  /**
   * Convert Prisma record to domain entity
   */
  private toDomain(record: PricingRuleRecord): PricingRule {
    return new PricingRule(
      record.id,
      record.businessId,
      record.name,
      record.type as PricingRuleType,
      record.priority,
      record.status as PricingRuleStatus,
      record.validFrom,
      record.validUntil,
      record.conditions as PricingConditions,
      record.discountType as DiscountType,
      Number(record.discountValue),
      record.minQuantity,
      record.maxQuantity,
      record.applicableDays,
      record.timeFrom,
      record.timeUntil,
      record.customerSegments,
      record.productIds,
      record.categoryIds,
      record.excludeProductIds,
      record.isCombinable,
      record.maxApplicationsPerTransaction,
      record.description ?? undefined,
    );
  }
}
