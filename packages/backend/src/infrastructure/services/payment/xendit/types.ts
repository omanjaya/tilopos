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

export type PaymentMethodType = 'QRIS' | 'VA' | 'EWALLET' | 'RETAIL' | 'CREDIT_CARD' | 'INVOICE';

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
    email?: string;
    mobile_number?: string;
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
// Virtual Account (Fixed VA / Callback Virtual Accounts API)
// NOTE: payloads follow the public Xendit API reference (POST
// /callback_virtual_accounts); not verified against a sandbox here.
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
  expected_amount?: number;
  is_closed: boolean;
  is_single_use: boolean;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  expiration_date: string;
}

// ============================================================================
// E-Wallet (E-Wallet Charges API: POST /ewallets/charges)
// NOTE: not verified against a sandbox.
// ============================================================================

export interface XenditEwalletChargeRequest {
  reference_id: string;
  currency: 'IDR';
  amount: number;
  checkout_method: 'ONE_TIME_PAYMENT';
  channel_code: string;
  channel_properties: {
    mobile_number?: string;
    success_redirect_url?: string;
  };
}

export interface XenditEwalletChargeResponse {
  id: string;
  reference_id: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'VOIDED' | 'REFUNDED';
  currency: string;
  charge_amount: number;
  capture_amount?: number | null;
  channel_code: string;
  actions?: {
    desktop_web_checkout_url?: string | null;
    mobile_web_checkout_url?: string | null;
    mobile_deeplink_checkout_url?: string | null;
    qr_checkout_string?: string | null;
  } | null;
}

// ============================================================================
// Retail Outlet (Fixed Payment Code API: POST /fixed_payment_code)
// NOTE: not verified against a sandbox.
// ============================================================================

export interface XenditRetailRequest {
  external_id: string;
  retail_outlet_name: 'ALFAMART' | 'INDOMARET';
  name: string;
  expected_amount: number;
  is_single_use?: boolean;
  expiration_date?: string;
}

export interface XenditRetailResponse {
  id: string;
  external_id: string;
  retail_outlet_name: string;
  payment_code: string;
  name: string;
  expected_amount: number;
  status: 'ACTIVE' | 'INACTIVE';
  expiration_date: string;
}

// ============================================================================
// Refund (Refunds API: POST /refunds, used for invoices)
// ============================================================================

export interface XenditRefundRequest {
  invoice_id: string;
  reference_id: string;
  amount: number;
  currency: 'IDR';
  reason: 'REQUESTED_BY_CUSTOMER' | 'CANCELLATION' | 'DUPLICATE' | 'FRAUDULENT' | 'OTHERS';
}

export interface XenditRefundResponse {
  id: string;
  invoice_id?: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
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

/**
 * Xendit REST endpoints. NOTE: aligned with the public API reference
 * (invoices v2, QR codes, callback VAs, e-wallet charges, fixed payment codes,
 * refunds) but not verified against a sandbox in this codebase.
 */
export const XENDIT_ENDPOINTS = {
  invoice: '/v2/invoices',
  qrcode: '/qr_codes',
  va: '/callback_virtual_accounts',
  ewallet: '/ewallets/charges',
  retail: '/fixed_payment_code',
  refunds: '/refunds',
} as const;

/**
 * Kind of Xendit object a gateway reference points to. The gateway returns
 * references as `<kind>:<xenditId>` so status checks and refunds call the one
 * correct API instead of guessing from the id shape (see parseXenditRef).
 */
export type XenditRefKind = 'invoice' | 'qris' | 'va' | 'ewallet' | 'retail';

const REF_KINDS: readonly XenditRefKind[] = ['invoice', 'qris', 'va', 'ewallet', 'retail'];

export function formatXenditRef(kind: XenditRefKind, id: string): string {
  return `${kind}:${id}`;
}

/**
 * Parses `<kind>:<id>`. References stored before kinds were introduced are
 * treated as invoices (the only kind created by the legacy default path).
 */
export function parseXenditRef(ref: string): { kind: XenditRefKind; id: string } {
  const idx = ref.indexOf(':');
  if (idx > 0) {
    const kind = ref.slice(0, idx) as XenditRefKind;
    if (REF_KINDS.includes(kind)) return { kind, id: ref.slice(idx + 1) };
  }
  return { kind: 'invoice', id: ref };
}
