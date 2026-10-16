import { IsString, IsOptional, IsNumber, IsObject, MaxLength } from 'class-validator';

/**
 * Xendit callback body. Xendit products send different shapes:
 * - Invoice callbacks are FLAT and carry no `event` (id, external_id, status,
 *   amount, paid_amount, payer_email, bank_code, merchant_name, fees_paid_amount, ...).
 * - Fixed VA payment callbacks are flat with payment_id / callback_virtual_account_id.
 * - Retail (fixed payment code) callbacks are flat with payment_code / retail_outlet_name.
 * - Legacy QR callbacks: { event: 'qr.payment', id, amount, status, qr_code: { external_id } }.
 * - Newer APIs (e-wallet charges, QR v2, refunds, payment requests) send
 *   { event, business_id, created, data: {...} }.
 *
 * Only the fields we read are declared and validated; the webhook routes use
 * whitelist without forbidNonWhitelisted, so undocumented extras are stripped
 * instead of rejecting a legitimate callback with 400.
 * NOTE: shapes follow the public Xendit docs; not verified against a sandbox.
 */
export class XenditWebhookDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  event?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  external_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  business_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  status?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  paid_amount?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  paid_at?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  payment_method?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  payment_channel?: string;

  /** Fixed VA / retail payment callbacks. */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  payment_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  callback_virtual_account_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  fixed_payment_code_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  created?: string;

  /** Legacy QR callback: { external_id, id, ... }. */
  @IsObject()
  @IsOptional()
  qr_code?: Record<string, unknown>;

  /** Newer APIs: payload under `data`. Read defensively by the mapper. */
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
