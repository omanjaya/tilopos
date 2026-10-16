import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsUUID,
  IsIn,
  IsInt,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionItemDto, PaymentDto } from './transaction.dto';
import { PaginationQueryDto, MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';

/** Methods accepted for credit repayments (credit notes cannot settle a receivable). */
export const CREDIT_PAYMENT_METHODS = [
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
] as const;

export const CREDIT_SALE_STATUSES = [
  'outstanding',
  'partially_paid',
  'settled',
  'overdue',
] as const;

export class CreateCreditTransactionDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ description: 'Ignored: the employee is taken from the token' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ description: 'Customer is required for credit sales' })
  @IsUUID()
  customerId!: string;

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

  @ApiPropertyOptional({ type: [PaymentDto], description: 'Optional down payment' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments?: PaymentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Due date for credit payment (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Notes specific to credit/BON agreement' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  creditNotes?: string;

  @ApiPropertyOptional({ description: 'Manual fixed discount (capped per role on the server)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999999)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Manual percentage discount 0-100 (capped per role)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;
}

export class RecordCreditPaymentDto {
  @ApiProperty({ description: 'Payment amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(99999999999)
  amount!: number;

  @ApiProperty({ enum: CREDIT_PAYMENT_METHODS })
  @IsIn(CREDIT_PAYMENT_METHODS)
  paymentMethod!: (typeof CREDIT_PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreditSaleFilterDto extends PaginationQueryDto {
  /** Defaults to the maximum page so existing clients (which sum the list) see full pages. */
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  override limit?: number = MAX_PAGE_SIZE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: CREDIT_SALE_STATUSES })
  @IsOptional()
  @IsIn(CREDIT_SALE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CustomerCreditSalesQueryDto extends PaginationQueryDto {
  /** Defaults to the maximum page so existing clients (which sum the list) see full pages. */
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  override limit?: number = MAX_PAGE_SIZE;

  @ApiPropertyOptional({ enum: CREDIT_SALE_STATUSES })
  @IsOptional()
  @IsIn(CREDIT_SALE_STATUSES)
  status?: string;
}

export class CreditOutstandingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;
}
