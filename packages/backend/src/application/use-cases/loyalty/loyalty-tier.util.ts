import { Prisma } from '@prisma/client';
import { money, type MoneyInput } from '@shared/utils/money';

/** Tier name customers get when no configured tier matches (schema default). */
export const DEFAULT_LOYALTY_TIER = 'regular';

export interface TierThreshold {
  name: string;
  minPoints: number;
  minSpent: Prisma.Decimal | number;
  sortOrder: number;
}

/**
 * Highest tier (by sortOrder) whose thresholds the customer meets, or null.
 * Pure function: callers load the tiers once and evaluate in memory.
 */
export function pickEligibleTier<T extends TierThreshold>(
  tiers: readonly T[],
  points: number,
  totalSpent: MoneyInput,
): T | null {
  const spent = money(totalSpent);
  const ordered = [...tiers].sort((a, b) => b.sortOrder - a.sortOrder);
  for (const tier of ordered) {
    if (points >= tier.minPoints && spent.gte(money(tier.minSpent))) {
      return tier;
    }
  }
  return null;
}
