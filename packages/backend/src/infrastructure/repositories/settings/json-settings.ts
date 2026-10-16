import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';

export type JsonObject = Record<string, unknown>;

export function asJsonObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as JsonObject) }
    : {};
}

/**
 * Read-modify-write of `businesses.settings` under a row lock (R9).
 * Concurrent writers of other keys (tax, printers, payment methods, schedules)
 * are serialised instead of silently overwriting each other.
 */
export async function mutateBusinessSettings<T>(
  prisma: PrismaService,
  businessId: string,
  mutate: (current: JsonObject) => { settings: JsonObject; result: T },
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ settings: unknown }[]>`
      SELECT settings FROM businesses WHERE id = ${businessId}::uuid FOR UPDATE`;
    if (rows.length === 0) {
      throw new NotFoundException('Business not found');
    }
    const { settings, result } = mutate(asJsonObject(rows[0].settings));
    await tx.business.update({
      where: { id: businessId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
    return result;
  });
}

export const OUTLET_SETTINGS_SELECT = {
  id: true,
  receiptHeader: true,
  receiptFooter: true,
  taxRate: true,
  serviceCharge: true,
  settings: true,
} as const;

export type OutletSettingsRow = Prisma.OutletGetPayload<{ select: typeof OUTLET_SETTINGS_SELECT }>;

/**
 * Read-modify-write of `outlets.settings` (plus optional column updates) under
 * a row lock, scoped to the caller's business. Unknown outlet → 404.
 */
export async function mutateOutletSettings(
  prisma: PrismaService,
  businessId: string,
  outletId: string,
  mutate: (current: JsonObject) => {
    settings: JsonObject;
    columns?: Pick<
      Prisma.OutletUpdateInput,
      'receiptHeader' | 'receiptFooter' | 'taxRate' | 'serviceCharge'
    >;
  },
): Promise<OutletSettingsRow> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ settings: unknown }[]>`
      SELECT settings FROM outlets
      WHERE id = ${outletId}::uuid AND business_id = ${businessId}::uuid
      FOR UPDATE`;
    if (rows.length === 0) {
      throw new NotFoundException('Outlet not found');
    }
    const { settings, columns } = mutate(asJsonObject(rows[0].settings));
    return tx.outlet.update({
      where: { id: outletId },
      data: { ...columns, settings: settings as Prisma.InputJsonValue },
      select: OUTLET_SETTINGS_SELECT,
    });
  });
}

/** Loads one outlet of the business for reading settings; 404 when not owned. */
export async function findOwnedOutletSettings(
  prisma: PrismaService,
  businessId: string,
  outletId: string,
): Promise<OutletSettingsRow> {
  const outlet = await prisma.outlet.findFirst({
    where: { id: outletId, businessId },
    select: OUTLET_SETTINGS_SELECT,
  });
  if (!outlet) {
    throw new NotFoundException('Outlet not found');
  }
  return outlet;
}

/** Loads business.settings; 404 when missing. */
export async function findBusinessSettings(
  prisma: PrismaService,
  businessId: string,
): Promise<JsonObject> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  if (!business) {
    throw new NotFoundException('Business not found');
  }
  return asJsonObject(business.settings);
}
