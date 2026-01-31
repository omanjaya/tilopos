import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerImportDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiProperty({ description: 'CSV content string or JSON array string' })
  @IsString()
  data!: string;
}

export class CustomerExportQueryDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  segment?: string;
}

export class BirthdayQueryDto {
  @ApiPropertyOptional({ description: 'Number of days ahead to look (default 7)' })
  @IsOptional()
  @IsString()
  daysAhead?: string;
}

export class BirthdayNotifyDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  customerIds!: string[];
}

export interface CustomerImportRow {
  name: string;
  email?: string;
  phone?: string;
  birthday?: string;
  loyaltyTier?: string;
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
