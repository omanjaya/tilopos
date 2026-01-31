import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum MidtransTransactionStatus {
  PENDING = 'pending',
  SETTLEMENT = 'settlement',
  CAPTURE = 'capture',
  DENY = 'deny',
  CANCEL = 'cancel',
  EXPIRE = 'expire',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
}

export class MidtransWebhookDto {
  @IsString()
  status_code!: string;

  @IsString()
  status_message!: string;

  @IsString()
  transaction_id!: string;

  @IsString()
  order_id!: string;

  @IsString()
  gross_amount!: string;

  @IsString()
  signature_key!: string;

  @IsString()
  @IsOptional()
  payment_type?: string;

  @IsEnum(MidtransTransactionStatus)
  @IsOptional()
  transaction_status?: MidtransTransactionStatus;

  @IsString()
  @IsOptional()
  fraud_status?: string;
}
