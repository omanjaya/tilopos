/**
 * Xendit Payment Gateway Types
 *
 * Type definitions for Xendit API requests and responses
 */

// ============================================================================
// Payment Methods
// ============================================================================

export type XenditPaymentMethod =
  | 'QRIS'
  | 'BCA'
  | 'BNI'
  | 'BRI'
  | 'MANDIRI'
  | 'PERMATA'
  | 'GOPAY'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY'
  | 'LINKAJA'
  | 'ALFAMART'
  | 'INDOMARET'
  | 'CREDIT_CARD';

export type PaymentMethodType = 'QRIS' | 'VA' | 'EWALLET' | 'RETAIL' | 'CREDIT_CARD';

export interface NormalizedPaymentMethod {
  type: PaymentMethodType;
  bankCode?: string;
  ewalletType?: string;
  retailOutlet?: string;
}

// ============================================================================
// Invoice (Multi-method Payment)
// ============================================================================

export interface XenditInvoiceRequest {
  external_id: string;
  amount: number;
  description?: string;
  invoice_duration?: number;
  payment_methods: XenditPaymentMethod[];
  customer?: {
    given_names: string;
    email: string;
    mobile_number: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  fees?: Array<{
    type: string;
    value: number;
  }>;
  should_authenticate_credit_card?: boolean;
  currency?: 'IDR';
  fixed_va?: boolean;
  for_user_id?: string;
  platform?: string;
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED' | 'VOIDED';
  amount: number;
  payment_channel: string | null;
  payment_method: string | null;
  payment_details: unknown | null;
  created: string;
  updated: string;
  invoice_url: string;
  expiry_date: string;
  user_id: string;
}

// ============================================================================
// QRIS
// ============================================================================

export interface XenditQRCodeRequest {
  external_id: string;
  type: 'DYNAMIC' | 'STATIC';
  callback_url: string;
  amount: number;
  currency?: 'IDR';
}

export interface XenditQRCodeResponse {
  id: string;
  external_id: string;
  amount: number;
  qr_string: string;
  created: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED';
  expiry_date: string;
}

// ============================================================================
// Virtual Account
// ============================================================================

export interface XenditVARequest {
  external_id: string;
  bank_code: 'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA';
  name: string;
  is_single_use?: boolean;
  is_closed?: boolean;
  expected_amount: number;
  expiration_date?: string;
  description?: string;
  currency?: 'IDR';
}

export interface XenditVAResponse {
  id: string;
  owner_id: string;
  external_id: string;
  bank_code: string;
  merchant_code: string;
  account_number: string;
  amount: number;
  is_closed: boolean;
  is_single_use: boolean;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'PAID';
  expiration_date: string;
}

// ============================================================================
// E-Wallet
// ============================================================================

export interface XenditEwalletRequest {
  external_id: string;
  amount: number;
  phone: string;
  ewallet_type: 'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA';
  callback_url: string;
  description?: string;
  currency?: 'IDR';
}

export interface XenditEwalletResponse {
  external_id: string;
  amount: number;
  phone: string;
  ewallet_type: string;
  checkout_url: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
}

// ============================================================================
// Retail Outlet
// ============================================================================

export interface XenditRetailRequest {
  external_id: string;
  retail_outlet_name: 'ALFAMART' | 'INDOMARET';
  name: string;
  expected_amount: number;
  payment_code: string;
  expiration_date?: string;
  currency?: 'IDR';
}

export interface XenditRetailResponse {
  external_id: string;
  retail_outlet_name: string;
  payment_code: string;
  name: string;
  expected_amount: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  expiration_date: string;
}

// ============================================================================
// Refund
// ============================================================================

export interface XenditRefundRequest {
  amount: number;
  reason?: string;
  external_id?: string;
}

export interface XenditRefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  created: string;
}

// ============================================================================
// Webhook
// ============================================================================

export interface XenditWebhookPayload {
  event: string;
  id: string;
  external_id: string;
  status: string;
  amount: number;
  payment_method: string;
  created: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface XenditConfig {
  apiKey: string;
  webhookToken: string;
  webhookUrl: string;
  baseUrl: string;
}

export const XENDIT_ENDPOINTS = {
  invoice: '/v2/invoices',
  qrcode: '/qr_codes',
  va: '/v2/payment_codes',
  ewallet: '/v2/ewallets',
  retail: '/v2/retail_outlets',
} as const;
