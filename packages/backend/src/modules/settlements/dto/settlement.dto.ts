import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@shared/dtos/pagination-query.dto';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'must be a date in YYYY-MM-DD format';

export const SETTLEMENT_PAYMENT_METHODS = [
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

export const SETTLEMENT_STATUSES = ['pending', 'settled', 'disputed'] as const;

export class ListSettlementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [...SETTLEMENT_STATUSES, 'all'] })
  @IsOptional()
  @IsIn([...SETTLEMENT_STATUSES, 'all'])
  status?: (typeof SETTLEMENT_STATUSES)[number] | 'all';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @Matches(DATE_ONLY, { message: `dateFrom ${DATE_MESSAGE}` })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @Matches(DATE_ONLY, { message: `dateTo ${DATE_MESSAGE}` })
  dateTo?: string;
}

export class ReconciliationQueryDto {
  @ApiProperty({ example: '2026-09-01', description: 'Business date (Asia/Jakarta)' })
  @Matches(DATE_ONLY, { message: `startDate ${DATE_MESSAGE}` })
  startDate!: string;

  @ApiProperty({ example: '2026-09-30', description: 'Business date (Asia/Jakarta), inclusive' })
  @Matches(DATE_ONLY, { message: `endDate ${DATE_MESSAGE}` })
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

export class CreateSettlementDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty({ enum: SETTLEMENT_PAYMENT_METHODS })
  @IsIn(SETTLEMENT_PAYMENT_METHODS)
  paymentMethod!: (typeof SETTLEMENT_PAYMENT_METHODS)[number];

  @ApiProperty({ example: '2026-09-26' })
  @Matches(DATE_ONLY, { message: `settlementDate ${DATE_MESSAGE}` })
  settlementDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  totalTransactions!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999_999)
  grossAmount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999_999)
  feeAmount!: number;

  @ApiProperty({ description: 'Must equal grossAmount - feeAmount' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999_999)
  netAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;
}

export class SettleSettlementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class DisputeSettlementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
