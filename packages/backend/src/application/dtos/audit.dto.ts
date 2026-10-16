import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Suspicious Activity Query
// ============================================================================

/**
 * Only patterns that are actually detected (see AuditService). Types without
 * a data source (no-sale drawer opens, price overrides) are not advertised.
 */
export enum SuspiciousActivityType {
  MULTIPLE_VOIDS = 'multiple_voids',
  UNUSUAL_DISCOUNT = 'unusual_discount',
  AFTER_HOURS = 'after_hours',
  LARGE_REFUND = 'large_refund',
}

/** Maximum date range (days) accepted by audit queries and exports. */
export const AUDIT_MAX_RANGE_DAYS = 366;

const toArray = ({ value }: { value: unknown }): unknown =>
  value === undefined || value === null || value === ''
    ? undefined
    : Array.isArray(value)
      ? value
      : [value];

/** Optional date range; accepts `YYYY-MM-DD` (business day, WIB) or ISO 8601. */
export class AuditDateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD or ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD or ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SuspiciousActivityQueryDto extends AuditDateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Types of suspicious activities to look for',
    enum: SuspiciousActivityType,
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(SuspiciousActivityType, { each: true })
  types?: SuspiciousActivityType[];

  @ApiPropertyOptional({ description: 'Filter by outlet ID' })
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

/** GET /audit — returns a plain array (page of results) for backwards compatibility. */
export class AuditListQueryDto extends AuditDateRangeQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = MAX_PAGE_SIZE;
}

export class AuditEntityQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  entityType!: string;

  @ApiProperty()
  @IsUUID()
  entityId!: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = MAX_PAGE_SIZE;
}

// ============================================================================
// Compliance Export
// ============================================================================

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export class ComplianceExportDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD or ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD or ISO 8601)' })
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
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  actionTypes?: string[];

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

/** Same filters as ComplianceExportDto, bound from the query string (GET). */
export class ComplianceExportQueryDto extends ComplianceExportDto {}

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
