import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { toNumber } from '../../shared/utils/money';
import type {
  CustomerSegmentSummary,
  SegmentCustomer,
  SegmentName,
  SegmentsSummaryResult,
} from './customers.types';
import { SEGMENT_TIME_PERIODS, SEGMENT_CRITERIA } from './customers.types';

export const SEGMENT_NAMES: readonly SegmentName[] = [
  'new',
  'returning',
  'vip',
  'at-risk',
  'inactive',
];

const DEFAULT_SEGMENT_PAGE_SIZE = 100;
const MAX_SEGMENT_PAGE_SIZE = 500;

const SEGMENT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  totalSpent: true,
  visitCount: true,
  loyaltyTier: true,
  loyaltyPoints: true,
  lastVisitAt: true,
  createdAt: true,
} as const;

/**
 * Customer segmentation computed in the database (R13): counts use COUNT queries
 * and segment lists are paginated, so no request loads every customer.
 *
 * - New: created in the last 30 days
 * - Returning: 3 or more visits
 * - VIP: top 10% by total spend
 * - At-Risk: last visit 60-90 days ago
 * - Inactive: no visit in 90+ days
 */
@Injectable()
export class CustomerSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSegmentsSummary(businessId: string): Promise<SegmentsSummaryResult> {
    const base = { businessId, isActive: true };
    const [totalCustomers, vipThreshold] = await Promise.all([
      this.prisma.customer.count({ where: base }),
      this.vipThreshold(businessId),
    ]);
    const now = new Date();

    const counts = await Promise.all(
      SEGMENT_NAMES.map((segment) =>
        segment === 'vip' && vipThreshold === null
          ? Promise.resolve(0)
          : this.prisma.customer.count({
              where: this.segmentWhere(businessId, segment, now, vipThreshold),
            }),
      ),
    );

    const [newCount, returning, vip, atRisk, inactive] = counts;
    return {
      totalCustomers,
      segments: this.buildSegmentsSummary({ new: newCount, returning, vip, atRisk, inactive }),
    };
  }

  async getCustomersBySegment(
    businessId: string,
    segment: SegmentName,
    page: { page?: number; limit?: number } = {},
  ): Promise<SegmentCustomer[]> {
    if (!SEGMENT_NAMES.includes(segment)) return [];
    const vipThreshold = segment === 'vip' ? await this.vipThreshold(businessId) : null;
    if (segment === 'vip' && vipThreshold === null) return [];

    const take = Math.min(
      Math.max(page.limit ?? DEFAULT_SEGMENT_PAGE_SIZE, 1),
      MAX_SEGMENT_PAGE_SIZE,
    );
    const skip = (Math.max(page.page ?? 1, 1) - 1) * take;

    const rows = await this.prisma.customer.findMany({
      where: this.segmentWhere(businessId, segment, new Date(), vipThreshold),
      select: SEGMENT_SELECT,
      orderBy:
        segment === 'vip'
          ? [{ totalSpent: 'desc' }, { id: 'asc' }]
          : [{ name: 'asc' }, { id: 'asc' }],
      take,
      skip,
    });

    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalSpent: toNumber(c.totalSpent),
      visitCount: c.visitCount,
      loyaltyTier: c.loyaltyTier,
      loyaltyPoints: c.loyaltyPoints,
      lastVisitAt: c.lastVisitAt,
      createdAt: c.createdAt,
    }));
  }

  /** Prisma filter for a segment; exported shape is reused by the customer export. */
  segmentWhere(
    businessId: string,
    segment: SegmentName,
    now: Date,
    vipThreshold: Prisma.Decimal | null,
  ): Prisma.CustomerWhereInput {
    const base: Prisma.CustomerWhereInput = { businessId, isActive: true };
    const thirtyDaysAgo = new Date(now.getTime() - SEGMENT_TIME_PERIODS.THIRTY_DAYS);
    const sixtyDaysAgo = new Date(now.getTime() - SEGMENT_TIME_PERIODS.SIXTY_DAYS);
    const ninetyDaysAgo = new Date(now.getTime() - SEGMENT_TIME_PERIODS.NINETY_DAYS);

    switch (segment) {
      case 'new':
        return { ...base, createdAt: { gte: thirtyDaysAgo } };
      case 'returning':
        return { ...base, visitCount: { gte: SEGMENT_CRITERIA.RETURNING_MIN_VISITS } };
      case 'vip':
        // Callers skip the query when there is no positive threshold.
        return { ...base, totalSpent: { gte: vipThreshold ?? new Prisma.Decimal(0) } };
      case 'at-risk':
        return { ...base, lastVisitAt: { lt: sixtyDaysAgo, gte: ninetyDaysAgo } };
      case 'inactive':
        return {
          ...base,
          OR: [
            { lastVisitAt: { lt: ninetyDaysAgo } },
            { lastVisitAt: null, createdAt: { lt: ninetyDaysAgo } },
          ],
        };
    }
  }

  /**
   * Spend of the customer at the top-10% boundary (Decimal compare, no floats).
   * Null when there are no customers or the boundary spend is zero.
   */
  async vipThreshold(businessId: string): Promise<Prisma.Decimal | null> {
    const total = await this.prisma.customer.count({ where: { businessId, isActive: true } });
    if (total === 0) return null;
    const rank = Math.max(1, Math.ceil(total * SEGMENT_CRITERIA.VIP_PERCENTILE));
    const boundary = await this.prisma.customer.findFirst({
      where: { businessId, isActive: true },
      orderBy: [{ totalSpent: 'desc' }, { id: 'asc' }],
      skip: rank - 1,
      select: { totalSpent: true },
    });
    if (!boundary || new Prisma.Decimal(boundary.totalSpent).lte(0)) return null;
    return new Prisma.Decimal(boundary.totalSpent);
  }

  private buildSegmentsSummary(counts: {
    new: number;
    returning: number;
    vip: number;
    atRisk: number;
    inactive: number;
  }): CustomerSegmentSummary[] {
    return [
      {
        segment: 'new',
        label: 'New Customers',
        description: 'Created in the last 30 days',
        count: counts.new,
      },
      {
        segment: 'returning',
        label: 'Returning Customers',
        description: '3 or more transactions',
        count: counts.returning,
      },
      {
        segment: 'vip',
        label: 'VIP Customers',
        description: 'Top 10% by total spend',
        count: counts.vip,
      },
      {
        segment: 'at-risk',
        label: 'At-Risk Customers',
        description: 'No transaction in 60-90 days',
        count: counts.atRisk,
      },
      {
        segment: 'inactive',
        label: 'Inactive Customers',
        description: 'No transaction in 90+ days',
        count: counts.inactive,
      },
    ];
  }
}
