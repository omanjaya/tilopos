import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsIn,
  IsUUID,
  IsDateString,
  ValidateIf,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const POS_PAYMENT_METHODS = [
  'cash',
  'card',
  'debit_card',
  'credit_card',
  'gopay',
  'ovo',
  'dana',
  'shopeepay',
  'linkaja',
  'qris',
  'bank_transfer',
  'credit_note',
] as const;

export class TransactionItemDto {
  @ApiPropertyOptional({ description: 'Required unless bundleId is given' })
  @ValidateIf((o: TransactionItemDto) => !o.bundleId)
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Required unless productId is given' })
  @ValidateIf((o: TransactionItemDto) => !o.productId)
  @IsUUID()
  bundleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100000)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  modifierIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Price override. Honoured only when feature pos_price_editing is enabled and role >= supervisor; otherwise the server price applies.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999999)
  unitPrice?: number;
}

export class PaymentDto {
  @ApiProperty({ enum: POS_PAYMENT_METHODS })
  @IsIn(POS_PAYMENT_METHODS)
  method!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(99999999999)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;
}

export class DiscountDto {
  @ApiProperty({ enum: ['percentage', 'fixed'] })
  @IsIn(['percentage', 'fixed'])
  type!: 'percentage' | 'fixed';

  @ApiProperty({
    description:
      'Manual discount value. Ignored for promotion/voucher discounts (computed server-side).',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999999)
  value!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promotionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  voucherCode?: string;
}

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({
    description: 'Ignored: the employee is always taken from the JWT. Accepted for older clients.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty()
  @IsUUID()
  shiftId!: string;

  @ApiProperty({ enum: ['dine_in', 'takeaway', 'delivery'] })
  @IsEnum(['dine_in', 'takeaway', 'delivery'])
  orderType!: 'dine_in' | 'takeaway' | 'delivery';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiProperty({ type: [TransactionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @ApiProperty({ type: [PaymentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  @ApiPropertyOptional({ type: [DiscountDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Client idempotency key (UUID). Re-submitting the same key for the outlet returns the original transaction.',
  })
  @IsOptional()
  @IsUUID()
  clientTransactionId?: string;

  @ApiPropertyOptional({
    description:
      'ISO timestamp of the sale on the device (offline sync); max 7 days old, not in the future.',
  })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

/** Cart pricing preview: same inputs as a sale, payments optional (decides cash rounding). */
export class PreviewTransactionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ enum: ['dine_in', 'takeaway', 'delivery'] })
  @IsEnum(['dine_in', 'takeaway', 'delivery'])
  orderType!: 'dine_in' | 'takeaway' | 'delivery';

  @ApiProperty({ type: [TransactionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @ApiPropertyOptional({ type: [PaymentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments?: PaymentDto[];

  @ApiPropertyOptional({ type: [DiscountDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];
}

/** Body of POST /pos/transactions/:id/payments. */
export class MultiPaymentDto {
  @ApiProperty({ type: [PaymentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  @ApiPropertyOptional({
    description:
      'Idempotency key (UUID): a retried request with the same key is not charged twice.',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

/** GET /pos/transactions query. */
export class ListTransactionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(100000)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "'all', one status or a comma-separated list (e.g. refunded,partially_refunded)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  status?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD (Asia/Jakarta) or ISO timestamp' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD (Asia/Jakarta, inclusive) or ISO timestamp' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

/** Optional outlet selector for owners/managers without an assigned outlet. */
export class OutletQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;
}
