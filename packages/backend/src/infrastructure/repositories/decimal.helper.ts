import { Decimal } from '@prisma/client/runtime/library';

/**
 * Converts a Prisma Decimal value to a JavaScript number.
 * Returns null if the input is null or undefined.
 */
export function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toNumber();
}

/**
 * Converts a Prisma Decimal value to a JavaScript number.
 * Returns 0 if the input is null or undefined.
 * Use this for required numeric fields that default to 0.
 */
export function decimalToNumberRequired(value: Decimal | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return value.toNumber();
}
