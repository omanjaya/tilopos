import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** YYYY-MM-DD (preferred) or a full ISO timestamp from older clients. */
const REPORT_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

export const REPORT_DATE_RANGES = [
  'today',
  'this_week',
  'this_month',
  'this_year',
  'custom',
] as const;

/** Common report query: outlet + WIB date range (see getDateRange). */
export class ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ enum: REPORT_DATE_RANGES })
  @IsOptional()
  @IsIn(REPORT_DATE_RANGES)
  dateRange?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @Matches(REPORT_DATE, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @Matches(REPORT_DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}

export class KitchenReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 240, default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  slaTargetMinutes?: number;
}

export class ReportSearchQueryDto extends ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export const INVOICE_STATUSES = [
  'all',
  'completed',
  'voided',
  'refunded',
  'partially_refunded',
] as const;

export class InvoiceListQueryDto extends ReportSearchQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];
}

export class AnalyticsProductsQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DailySalesQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty({ example: '2026-09-27' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReportExportQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ApiProperty({ enum: ['pdf', 'excel'] })
  @IsIn(['pdf', 'excel'])
  format!: 'pdf' | 'excel';
}

// ---------------------------------------------------------------------------
// Custom report builder
// ---------------------------------------------------------------------------

export const REPORT_METRICS = [
  'sales',
  'items',
  'payments',
  'customers',
  'orders',
  'refunds',
  'discounts',
  'tax',
] as const;
export const REPORT_DIMENSIONS = [
  'date',
  'product',
  'category',
  'employee',
  'outlet',
  'payment_method',
  'order_type',
  'hour',
] as const;

export class CustomReportFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  orderType?: string;
}

export class CustomReportConfigDto {
  @ApiProperty({ enum: REPORT_METRICS, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(REPORT_METRICS.length)
  @IsIn(REPORT_METRICS, { each: true })
  metrics!: (typeof REPORT_METRICS)[number][];

  @ApiProperty({ enum: REPORT_DIMENSIONS, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(REPORT_DIMENSIONS, { each: true })
  dimensions!: (typeof REPORT_DIMENSIONS)[number][];

  @ApiPropertyOptional({ type: CustomReportFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomReportFiltersDto)
  filters?: CustomReportFiltersDto;

  @ApiProperty({ example: '2026-09-01' })
  @Matches(REPORT_DATE, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @ApiProperty({ example: '2026-09-30' })
  @Matches(REPORT_DATE, { message: 'endDate must be YYYY-MM-DD' })
  endDate!: string;
}

export class SaveReportTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: CustomReportConfigDto })
  @ValidateNested()
  @Type(() => CustomReportConfigDto)
  config!: CustomReportConfigDto;
}

export class InventoryExportQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty({ enum: ['pdf', 'excel'] })
  @IsIn(['pdf', 'excel'])
  format!: 'pdf' | 'excel';
}
