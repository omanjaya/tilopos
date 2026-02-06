import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Segment name types representing different customer categories
 */
export type SegmentName = 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive';

/**
 * Valid loyalty tiers for customers
 */
export const VALID_LOYALTY_TIERS = ['regular', 'silver', 'gold', 'platinum'] as const;

/**
 * Summary of a customer segment with metadata
 */
export interface CustomerSegmentSummary {
  segment: SegmentName;
  label: string;
  description: string;
  count: number;
}

/**
 * Customer data for segment analysis
 */
export interface SegmentCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalSpent: number;
  visitCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}

/**
 * Transaction item in purchase history
 */
export interface PurchaseHistoryItem {
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Payment information in purchase history
 */
export interface PurchaseHistoryPayment {
  method: string;
  amount: number;
}

/**
 * Transaction in purchase history
 */
export interface PurchaseHistoryTransaction {
  id: string;
  receiptNumber: string;
  transactionType: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  createdAt: Date;
  items: PurchaseHistoryItem[];
  payments: PurchaseHistoryPayment[];
}

/**
 * Complete purchase history result with pagination
 */
export interface PurchaseHistoryResult {
  customerId: string;
  total: number;
  transactions: PurchaseHistoryTransaction[];
}

/**
 * Raw customer data from database for segmentation
 * @internal
 */
export interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalSpent: Decimal;
  visitCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}

/**
 * Customer data for export operations
 */
export interface ExportCustomerData {
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  loyaltyTier: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  createdAt: Date;
}

/**
 * Segments summary result
 */
export interface SegmentsSummaryResult {
  totalCustomers: number;
  segments: CustomerSegmentSummary[];
}

/**
 * Time periods for segment calculation (in milliseconds)
 */
export const SEGMENT_TIME_PERIODS = {
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  SIXTY_DAYS: 60 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Segment criteria configuration
 */
export const SEGMENT_CRITERIA = {
  VIP_PERCENTILE: 0.1, // Top 10% by spend
  RETURNING_MIN_VISITS: 3,
} as const;
