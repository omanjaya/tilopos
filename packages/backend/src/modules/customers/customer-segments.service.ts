import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
  CustomerSegmentSummary,
  SegmentCustomer,
  SegmentName,
  CustomerRow,
  SegmentsSummaryResult,
} from './customers.types';
import { SEGMENT_TIME_PERIODS, SEGMENT_CRITERIA } from './customers.types';

/**
 * Service responsible for customer segmentation logic
 *
 * Segments customers into categories:
 * - New: Created in the last 30 days
 * - Returning: 3 or more transactions
 * - VIP: Top 10% by total spend
 * - At-Risk: No transaction in 60-90 days
 * - Inactive: No transaction in 90+ days
 */
@Injectable()
export class CustomerSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get summary of all customer segments with counts
   */
  async getSegmentsSummary(businessId: string): Promise<SegmentsSummaryResult> {
    const customers = await this.fetchCustomersForSegmentation(businessId);
    const now = new Date();
    const timeThresholds = this.calculateTimeThresholds(now);

    const counts = {
      new: this.countNewCustomers(customers, timeThresholds.thirtyDaysAgo),
      returning: this.countReturningCustomers(customers),
      vip: this.countVIPCustomers(customers),
      atRisk: this.countAtRiskCustomers(customers, timeThresholds),
      inactive: this.countInactiveCustomers(customers, timeThresholds),
    };

    return {
      totalCustomers: customers.length,
      segments: this.buildSegmentsSummary(counts),
    };
  }

  /**
   * Get list of customers in a specific segment
   */
  async getCustomersBySegment(
    businessId: string,
    segment: SegmentName,
  ): Promise<SegmentCustomer[]> {
    const customers = await this.fetchCustomersForSegmentation(businessId);
    const filtered = this.filterCustomersBySegment(customers, segment);

    return filtered.map((c) => this.toSegmentCustomer(c));
  }

  /**
   * Fetch all active customers for segmentation analysis
   * @private
   */
  private async fetchCustomersForSegmentation(businessId: string): Promise<CustomerRow[]> {
    return this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: {
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
      },
    });
  }

  /**
   * Calculate time threshold dates for segmentation
   * @private
   */
  private calculateTimeThresholds(now: Date): {
    thirtyDaysAgo: Date;
    sixtyDaysAgo: Date;
    ninetyDaysAgo: Date;
  } {
    return {
      thirtyDaysAgo: new Date(now.getTime() - SEGMENT_TIME_PERIODS.THIRTY_DAYS),
      sixtyDaysAgo: new Date(now.getTime() - SEGMENT_TIME_PERIODS.SIXTY_DAYS),
      ninetyDaysAgo: new Date(now.getTime() - SEGMENT_TIME_PERIODS.NINETY_DAYS),
    };
  }

  /**
   * Count new customers (created in last 30 days)
   * @private
   */
  private countNewCustomers(customers: CustomerRow[], thirtyDaysAgo: Date): number {
    return customers.filter((c) => c.createdAt >= thirtyDaysAgo).length;
  }

  /**
   * Count returning customers (3+ visits)
   * @private
   */
  private countReturningCustomers(customers: CustomerRow[]): number {
    return customers.filter((c) => c.visitCount >= SEGMENT_CRITERIA.RETURNING_MIN_VISITS).length;
  }

  /**
   * Count VIP customers (top 10% by spend)
   * @private
   */
  private countVIPCustomers(customers: CustomerRow[]): number {
    const vipThreshold = this.calculateVIPThreshold(customers);
    return customers.filter((c) => c.totalSpent.toNumber() >= vipThreshold && vipThreshold > 0)
      .length;
  }

  /**
   * Count at-risk customers (no visit in 60-90 days)
   * @private
   */
  private countAtRiskCustomers(
    customers: CustomerRow[],
    thresholds: { sixtyDaysAgo: Date; ninetyDaysAgo: Date },
  ): number {
    return customers.filter((c) => {
      if (!c.lastVisitAt) return false;
      return c.lastVisitAt < thresholds.sixtyDaysAgo && c.lastVisitAt >= thresholds.ninetyDaysAgo;
    }).length;
  }

  /**
   * Count inactive customers (no visit in 90+ days)
   * @private
   */
  private countInactiveCustomers(
    customers: CustomerRow[],
    thresholds: { ninetyDaysAgo: Date },
  ): number {
    return customers.filter((c) => {
      if (!c.lastVisitAt) {
        // No visit and created more than 90 days ago
        return c.createdAt < thresholds.ninetyDaysAgo;
      }
      return c.lastVisitAt < thresholds.ninetyDaysAgo;
    }).length;
  }

  /**
   * Calculate VIP threshold (top 10% by spend)
   * @private
   */
  private calculateVIPThreshold(customers: CustomerRow[]): number {
    if (customers.length === 0) return 0;

    const sortedBySpend = [...customers].sort(
      (a, b) => b.totalSpent.toNumber() - a.totalSpent.toNumber(),
    );

    const vipThresholdIndex = Math.max(
      1,
      Math.ceil(customers.length * SEGMENT_CRITERIA.VIP_PERCENTILE),
    );

    return sortedBySpend[
      Math.min(vipThresholdIndex - 1, sortedBySpend.length - 1)
    ].totalSpent.toNumber();
  }

  /**
   * Filter customers by segment criteria
   * @private
   */
  private filterCustomersBySegment(customers: CustomerRow[], segment: SegmentName): CustomerRow[] {
    const now = new Date();
    const timeThresholds = this.calculateTimeThresholds(now);

    switch (segment) {
      case 'new':
        return customers.filter((c) => c.createdAt >= timeThresholds.thirtyDaysAgo);

      case 'returning':
        return customers.filter((c) => c.visitCount >= SEGMENT_CRITERIA.RETURNING_MIN_VISITS);

      case 'vip': {
        const vipThreshold = this.calculateVIPThreshold(customers);
        return customers.filter((c) => c.totalSpent.toNumber() >= vipThreshold && vipThreshold > 0);
      }

      case 'at-risk':
        return customers.filter((c) => {
          if (!c.lastVisitAt) return false;
          return (
            c.lastVisitAt < timeThresholds.sixtyDaysAgo &&
            c.lastVisitAt >= timeThresholds.ninetyDaysAgo
          );
        });

      case 'inactive':
        return customers.filter((c) => {
          if (!c.lastVisitAt) {
            return c.createdAt < timeThresholds.ninetyDaysAgo;
          }
          return c.lastVisitAt < timeThresholds.ninetyDaysAgo;
        });

      default:
        return [];
    }
  }

  /**
   * Build segments summary array with metadata
   * @private
   */
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

  /**
   * Convert database customer row to segment customer DTO
   * @private
   */
  private toSegmentCustomer(c: CustomerRow): SegmentCustomer {
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalSpent: c.totalSpent.toNumber(),
      visitCount: c.visitCount,
      loyaltyTier: c.loyaltyTier,
      loyaltyPoints: c.loyaltyPoints,
      lastVisitAt: c.lastVisitAt,
      createdAt: c.createdAt,
    };
  }
}
