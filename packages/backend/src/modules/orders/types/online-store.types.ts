/**
 * Online Store Types & Interfaces
 *
 * Type definitions for online store features including:
 * - Store configuration
 * - Product catalog
 * - Order management
 */

import { StoreOrderStatus, StoreOrderPaymentStatus } from '@prisma/client';

// ========================================
// STORE CONFIGURATION TYPES
// ========================================

export interface OnlineStoreConfig {
  id: string;
  businessId: string;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeSettings: Record<string, unknown>;
  shippingMethods: unknown[];
  paymentMethods: unknown[];
  isActive: boolean;
}

// ========================================
// CATALOG TYPES
// ========================================

export interface StoreCatalogCategory {
  id: string;
  name: string;
  products: StoreCatalogProduct[];
}

export interface StoreCatalogProduct {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  inStock: boolean;
}

export interface StoreCatalogResponse {
  categories: StoreCatalogCategory[];
}

// ========================================
// ORDER TYPES
// ========================================

export interface StoreOrderInfo {
  id: string;
  storeId: string;
  outletId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  grandTotal: number;
  paymentStatus: StoreOrderPaymentStatus;
  orderStatus: StoreOrderStatus;
  notes?: string;
  createdAt: Date;
}

export interface CreateStoreOrderDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  items: CreateStoreOrderItemDto[];
  notes?: string;
  outletId: string;
}

export interface CreateStoreOrderItemDto {
  productId: string;
  quantity: number;
}

export interface StoreOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// ========================================
// PAYMENT TYPES
// ========================================

export interface StorePaymentMethod {
  method: 'qris' | 'bank_transfer';
}

export interface StorePaymentResult {
  qrCode?: string;
  vaNumber?: string;
  expiresAt: Date;
}

// ========================================
// QUERY OPTIONS
// ========================================

export interface GetStoreOrdersOptions {
  status?: StoreOrderStatus;
  limit?: number;
}
