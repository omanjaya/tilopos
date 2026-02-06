/**
 * Self-Order Types & Interfaces
 *
 * Type definitions for self-order features including:
 * - Session management
 * - Cart operations
 * - Payment processing
 */

import { SelfOrderSessionStatus, Prisma } from '@prisma/client';

// ========================================
// SESSION TYPES
// ========================================

export interface SelfOrderSessionInfo {
  id: string;
  outletId: string;
  tableId?: string;
  tableName?: string;
  sessionCode: string;
  status: SelfOrderSessionStatus;
  customerName?: string;
  language: string;
  expiresAt: Date;
  createdAt: Date;
  items: SelfOrderCartItem[];
}

// ========================================
// CART TYPES
// ========================================

export interface SelfOrderCartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  notes?: string;
  subtotal: number;
}

export interface AddToCartDto {
  sessionId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
}

// ========================================
// PAYMENT TYPES
// ========================================

export interface SelfOrderPaymentDto {
  sessionId: string;
  paymentMethod: 'qris' | 'gopay' | 'ovo' | 'dana' | 'shopeepay';
}

export interface PaymentResult {
  success: boolean;
  qrCode?: string;
  checkoutUrl?: string;
  expiresAt?: Date;
}

// ========================================
// MENU TYPES
// ========================================

export interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  variants?: MenuVariant[];
  modifierGroups?: MenuModifierGroup[];
}

export interface MenuVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  modifiers: MenuModifier[];
}

export interface MenuModifier {
  id: string;
  name: string;
  price: number;
}

export interface MenuResponse {
  categories: MenuCategory[];
}

// ========================================
// ORDER SUBMISSION TYPES
// ========================================

export interface OrderSubmissionResult {
  orderId: string;
  orderNumber: string;
}

// ========================================
// TYPE GUARDS & UTILITIES
// ========================================

export function isValidPaymentMethod(
  method: string,
): method is SelfOrderPaymentDto['paymentMethod'] {
  return ['qris', 'gopay', 'ovo', 'dana', 'shopeepay'].includes(method);
}

export type ModifiersJson = Prisma.InputJsonValue;
