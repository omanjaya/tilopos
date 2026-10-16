/**
 * Safe relation selects (Docs/ENGINEERING-RULES.md R12).
 * Never `include: { employee: true }` — that returns the PIN hash and MFA secret.
 */
export const EMPLOYEE_PUBLIC_SELECT = {
  id: true,
  name: true,
  role: true,
  outletId: true,
} as const;

export const CUSTOMER_PUBLIC_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
} as const;

/** Product fields that may be shown to anonymous customers (no cost price). */
export const PRODUCT_PUBLIC_SELECT = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  basePrice: true,
  categoryId: true,
  isActive: true,
} as const;
