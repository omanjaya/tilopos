import { Prisma } from '@prisma/client';

/**
 * Money helpers (Docs/ENGINEERING-RULES.md R8). All arithmetic goes through
 * Prisma.Decimal and results are rounded to whole rupiah (IDR has no minor unit
 * in practice) with ROUND_HALF_UP.
 */
export type MoneyInput = Prisma.Decimal | number | string | null | undefined;

const ZERO = new Prisma.Decimal(0);

export function money(value: MoneyInput): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

/** Round to whole rupiah. */
export function roundRupiah(value: MoneyInput): Prisma.Decimal {
  return money(value).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}

export function sumMoney(values: readonly MoneyInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.plus(money(v)), ZERO);
}

export function multiplyMoney(amount: MoneyInput, factor: MoneyInput): Prisma.Decimal {
  return money(amount).times(money(factor));
}

/** `percent` of `amount` (percent given as 0-100). */
export function percentOf(amount: MoneyInput, percent: MoneyInput): Prisma.Decimal {
  return money(amount).times(money(percent)).dividedBy(100);
}

/** Clamp to >= 0 (e.g. a discount can never exceed the subtotal). */
export function nonNegative(value: MoneyInput): Prisma.Decimal {
  const d = money(value);
  return d.isNegative() ? ZERO : d;
}

export function minMoney(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return Prisma.Decimal.min(money(a), money(b));
}

/** For API responses / legacy number fields only — never for further arithmetic. */
export function toNumber(value: MoneyInput): number {
  return money(value).toNumber();
}
