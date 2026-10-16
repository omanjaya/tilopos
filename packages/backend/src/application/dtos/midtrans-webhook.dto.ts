import { IsString, IsOptional, IsNumberString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * Midtrans HTTP notification. Only the fields we use are declared; the
 * webhook route validates with whitelist (unknown fields are stripped, not
 * rejected), because Midtrans sends many channel-specific extras
 * (va_numbers, transaction_time, merchant_id, ...).
 */
export class MidtransWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  status_code!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  status_message?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  transaction_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  order_id!: string;

  /** e.g. "10000.00" */
  @IsNumberString()
  gross_amount!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  signature_key!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  payment_type?: string;

  /** Required: a notification without a status cannot be applied. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  transaction_status!: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  fraud_status?: string;
}
