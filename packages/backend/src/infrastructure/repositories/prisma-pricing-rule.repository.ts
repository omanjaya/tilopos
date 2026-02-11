import { Injectable } from '@nestjs/common';
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
    const where: Record<string, unknown> = {
      businessId: options.businessId,
    };

    if (options.type) {
      where.type = options.type;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.activeAt) {
      where.validFrom = { lte: options.activeAt };
      where.OR = [{ validUntil: null }, { validUntil: { gte: options.activeAt } }];
    }

    if (options.productIds && options.productIds.length > 0) {
      where.OR = [
        { productIds: { hasSome: options.productIds } },
        { productIds: { isEmpty: true } },
      ];
    }

    if (options.categoryIds && options.categoryIds.length > 0) {
      where.OR = [
        { categoryIds: { hasSome: options.categoryIds } },
        { categoryIds: { isEmpty: true } },
      ];
    }

    const records = await this.prisma.pricingRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    return records.map((record: PricingRuleRecord) => this.toDomain(record));
  }

  async findActiveForProduct(
    businessId: string,
    productId: string,
    categoryId?: string,
  ): Promise<PricingRule[]> {
    const now = new Date();

    const records = await this.prisma.pricingRule.findMany({
      where: {
        businessId,
        status: 'active',
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { priority: 'desc' },
    });

    // Filter by product/category in application layer
    // (Prisma doesn't support complex array queries well)
    const rules = records
      .map((record: PricingRuleRecord) => this.toDomain(record))
      .filter((rule: PricingRule) => rule.appliesTo(productId, categoryId));

    return rules;
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
    const existing = await this.findById(id, businessId);
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }

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

    const record = await this.prisma.pricingRule.update({
      where: { id },
      data,
    });

    return this.toDomain(record);
  }

  async delete(id: string, businessId: string): Promise<void> {
    const existing = await this.findById(id, businessId);
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }

    await this.prisma.pricingRule.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, businessId: string, status: string): Promise<void> {
    const existing = await this.findById(id, businessId);
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pricing rule not found');
    }

    await this.prisma.pricingRule.update({
      where: { id },
      data: { status: status as PricingRuleStatus },
    });
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
