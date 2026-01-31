import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Suspicious Activity Query
// ============================================================================

export enum SuspiciousActivityType {
  MULTIPLE_VOIDS = 'multiple_voids',
  UNUSUAL_DISCOUNT = 'unusual_discount',
  CASH_DRAWER_NO_SALE = 'cash_drawer_no_sale',
  AFTER_HOURS = 'after_hours',
  LARGE_REFUND = 'large_refund',
  FREQUENT_NO_SALE = 'frequent_no_sale',
  PRICE_OVERRIDE = 'price_override',
}

export class SuspiciousActivityQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Types of suspicious activities to look for',
    enum: SuspiciousActivityType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SuspiciousActivityType, { each: true })
  types?: SuspiciousActivityType[];

  @ApiPropertyOptional({ description: 'Filter by outlet ID' })
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

// ============================================================================
// Compliance Export
// ============================================================================

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export class ComplianceExportDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ description: 'Export format', enum: ExportFormat })
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @ApiPropertyOptional({
    description: 'Filter by action types',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actionTypes?: string[];

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

// ============================================================================
// Suspicious Activity Result
// ============================================================================

export interface SuspiciousActivityRecord {
  type: SuspiciousActivityType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  employeeId: string | null;
  employeeName?: string;
  outletId: string | null;
  occurredAt: Date;
  relatedEntityType: string;
  relatedEntityId: string | null;
  details: Record<string, unknown>;
}

export interface AuditSummary {
  totalLogs: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byEmployee: { employeeId: string; count: number }[];
  suspiciousCount: number;
  dateRange: { start: Date; end: Date };
}

export interface ComplianceExportResult {
  format: ExportFormat;
  recordCount: number;
  data: string; // CSV string or JSON string
  generatedAt: Date;
}
