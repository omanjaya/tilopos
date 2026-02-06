/**
 * Points Expiry Business Rules
 *
 * Contains all business logic for points expiration calculation.
 */

import { LoyaltyProgram } from '@prisma/client';

export class ExpiryRules {
  /**
   * Calculate expiry date for newly earned points
   */
  static calculateExpiryDate(earnedAt: Date, program: LoyaltyProgram): Date | null {
    if (!program.pointExpiryDays) {
      return null; // Points never expire
    }

    const expiryDate = new Date(earnedAt);
    expiryDate.setDate(expiryDate.getDate() + Number(program.pointExpiryDays));
    return expiryDate;
  }

  /**
   * Calculate expiry threshold date
   * (transactions earned before this date should be expired)
   */
  static calculateExpiryThreshold(currentDate: Date, expiryDays: number): Date {
    const threshold = new Date(currentDate);
    threshold.setDate(threshold.getDate() - expiryDays);
    return threshold;
  }

  /**
   * Check if points should be expired
   */
  static shouldExpire(expiryDate: Date | null, currentDate: Date): boolean {
    if (!expiryDate) {
      return false; // No expiry date set
    }
    return currentDate >= expiryDate;
  }

  /**
   * Check if program has expiry enabled
   */
  static hasExpiryEnabled(program: LoyaltyProgram): boolean {
    return program.pointExpiryDays !== null && Number(program.pointExpiryDays) > 0;
  }

  /**
   * Calculate days until expiry
   */
  static calculateDaysUntilExpiry(expiryDate: Date | null, currentDate: Date): number | null {
    if (!expiryDate) {
      return null; // Never expires
    }

    const diffTime = expiryDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Group expired transactions by customer
   */
  static groupExpiryByCustomer<T extends { customerId: string; points: number }>(
    transactions: T[],
  ): Map<string, { total: number; transactions: T[] }> {
    const grouped = new Map<string, { total: number; transactions: T[] }>();

    for (const tx of transactions) {
      if (!grouped.has(tx.customerId)) {
        grouped.set(tx.customerId, { total: 0, transactions: [] });
      }
      const entry = grouped.get(tx.customerId)!;
      entry.total += tx.points;
      entry.transactions.push(tx);
    }

    return grouped;
  }
}
