import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Hard cap on rows per import request (R13). */
export const MAX_IMPORT_ROWS = 5000;

export class CustomerImportDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiProperty({ description: 'CSV content string or JSON array string (max 2 MB)' })
  @IsString()
  @MaxLength(2_000_000)
  data!: string;
}

export class CustomerExportQueryDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiPropertyOptional({ enum: ['new', 'returning', 'vip', 'at-risk', 'inactive'] })
  @IsOptional()
  @IsEnum(['new', 'returning', 'vip', 'at-risk', 'inactive'])
  segment?: 'new' | 'returning' | 'vip' | 'at-risk' | 'inactive';
}

export class BirthdayQueryDto {
  @ApiPropertyOptional({ description: 'Number of days ahead to look (default 7)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  daysAhead?: number;
}

export class BirthdayNotifyDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  customerIds!: string[];
}

export interface CustomerImportRow {
  name: string;
  email?: string;
  phone?: string;
  birthday?: string;
  loyaltyTier?: string;
  address?: string;
  notes?: string;
}

export interface CustomerImportResultError {
  row: number;
  field: string;
  message: string;
}

export interface CustomerImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: CustomerImportResultError[];
}

export interface BirthdayCustomer {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: Date;
  daysUntilBirthday: number;
}
