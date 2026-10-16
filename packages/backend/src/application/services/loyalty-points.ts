import { Prisma } from '@prisma/client';
import { money, type MoneyInput } from '@shared/utils/money';

/**
 * The one loyalty accrual formula (receipt preview and the actual credit must
 * agree): floor(amount / amountPerPoint * tierMultiplier).
 * Returns 0 for a non-positive amountPerPoint (misconfigured program).
 */
export function computeLoyaltyPoints(
  amount: MoneyInput,
  amountPerPoint: MoneyInput,
  multiplier: MoneyInput = 1,
): number {
  const per = money(amountPerPoint);
  if (per.lte(0)) return 0;
  const points = money(amount)
    .dividedBy(per)
    .times(money(multiplier))
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);
  return points.isNegative() ? 0 : points.toNumber();
}

/** Highest active tier whose minPoints the customer has reached. */
export function tierForPoints<T extends { name: string; minPoints: number }>(
  tiers: readonly T[],
  points: number,
): T | undefined {
  return [...tiers]
    .sort((a, b) => b.minPoints - a.minPoints)
    .find((tier) => points >= tier.minPoints);
}
