import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import {
  money,
  multiplyMoney,
  percentOf,
  roundRupiah,
  sumMoney,
  toNumber,
} from '@shared/utils/money';

type Db = PrismaService | Prisma.TransactionClient;

/** Shape stored in SelfOrderItem.modifiers (server-resolved snapshot). */
export interface StoredModifier {
  id: string;
  name: string;
  price: string;
}

/** Extracts modifier ids from the JSON column; anything without a string id is ignored. */
export function modifierIdsOf(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((m) => (m && typeof m === 'object' ? (m as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export interface PricedModifier {
  id: string;
  name: string;
  price: Prisma.Decimal;
  productIds: string[];
}

/**
 * Loads active modifiers by id, scoped to the business, together with the
 * products they are attached to (so a modifier can only price a product that
 * actually offers it). Prices always come from the DB, never from the client.
 */
export async function loadModifiers(
  db: Db,
  businessId: string,
  ids: readonly string[],
): Promise<Map<string, PricedModifier>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db.modifier.findMany({
    where: {
      id: { in: unique },
      isActive: true,
      modifierGroup: { businessId, isActive: true },
    },
    select: {
      id: true,
      name: true,
      price: true,
      modifierGroup: { select: { productModifierGroups: { select: { productId: true } } } },
    },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        name: r.name,
        price: money(r.price),
        productIds: r.modifierGroup.productModifierGroups.map((p) => p.productId),
      },
    ]),
  );
}

export interface PricingItem {
  productId: string;
  quantity: number;
  modifiers: unknown;
  product: { basePrice: Prisma.Decimal | number | string };
  variant: { price: Prisma.Decimal | number | string } | null;
}

export interface SessionTotals {
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  itemCount: number;
}

/**
 * Server-side total of a self-order cart (R8): unit price (variant or base) plus
 * modifier prices resolved from the DB, times quantity; tax and service charge
 * are percentages of the subtotal, each rounded to whole rupiah.
 */
export function computeSessionTotals(
  items: readonly PricingItem[],
  modifiers: Map<string, PricedModifier>,
  taxRate: Prisma.Decimal | number | string,
  serviceChargeRate: Prisma.Decimal | number | string,
): SessionTotals & { grandTotalDecimal: Prisma.Decimal } {
  const lines = items.map((item) => {
    const base = item.variant ? money(item.variant.price) : money(item.product.basePrice);
    const modifierTotal = sumMoney(
      modifierIdsOf(item.modifiers)
        .map((id) => modifiers.get(id))
        .filter((m): m is PricedModifier => !!m && m.productIds.includes(item.productId))
        .map((m) => m.price),
    );
    return multiplyMoney(base.plus(modifierTotal), item.quantity);
  });

  const subtotal = roundRupiah(sumMoney(lines));
  const taxAmount = roundRupiah(percentOf(subtotal, taxRate));
  const serviceChargeAmount = roundRupiah(percentOf(subtotal, serviceChargeRate));
  const grandTotal = subtotal.plus(taxAmount).plus(serviceChargeAmount);

  return {
    subtotal: toNumber(subtotal),
    taxAmount: toNumber(taxAmount),
    serviceChargeAmount: toNumber(serviceChargeAmount),
    grandTotal: toNumber(grandTotal),
    grandTotalDecimal: grandTotal,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
