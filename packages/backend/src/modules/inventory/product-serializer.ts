import type { Prisma } from '@prisma/client';
import { EmployeeRole } from '@shared/constants/roles';

/** Roles allowed to see cost prices (HPP). Everyone else gets `costPrice: null`. */
const COST_VISIBLE_ROLES: ReadonlySet<string> = new Set([
  EmployeeRole.SUPER_ADMIN,
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.INVENTORY,
]);

export function canSeeCost(role: string | undefined): boolean {
  return !!role && COST_VISIBLE_ROLES.has(role);
}

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

function num(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

type WithPrices = {
  basePrice?: DecimalLike;
  costPrice?: DecimalLike;
  price?: DecimalLike;
  variants?: WithPrices[];
  priceTiers?: Array<{ price?: DecimalLike }>;
};

type Serialized<T> = Omit<T, 'basePrice' | 'costPrice' | 'price' | 'variants' | 'priceTiers'> & {
  basePrice?: number;
  costPrice?: number | null;
  price?: number;
  variants?: unknown[];
  priceTiers?: unknown[];
};

/**
 * Maps Decimal price columns of a product/variant row to numbers (API boundary)
 * and hides cost prices from roles that must not see them (R12).
 */
export function serializeProduct<T extends WithPrices>(row: T, showCost: boolean): Serialized<T> {
  const out: Record<string, unknown> = { ...row };
  if ('basePrice' in row) out.basePrice = num(row.basePrice) ?? 0;
  if ('price' in row) out.price = num(row.price) ?? 0;
  if ('costPrice' in row) out.costPrice = showCost ? num(row.costPrice) : null;
  if (Array.isArray(row.variants)) {
    out.variants = row.variants.map((v) => serializeProduct(v, showCost));
  }
  if (Array.isArray(row.priceTiers)) {
    out.priceTiers = row.priceTiers.map((t) => ({ ...t, price: num(t.price) ?? 0 }));
  }
  return out as Serialized<T>;
}
