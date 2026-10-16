import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';

/** Turns the query-string values "true"/"1" into true and everything else into false. */
const toBoolean = ({ value }: { value: unknown }): boolean =>
  value === true || value === 'true' || value === '1';

/**
 * Optional pagination: when neither `page` nor `limit` is sent, list endpoints keep
 * returning a plain (capped) array for backward compatibility (POS catalog, stock page);
 * when either is sent they return `{ data, total, page, limit, totalPages }`.
 */
export class OptionalPageQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}

export const PRODUCT_SORT_FIELDS = ['name', 'basePrice', 'createdAt'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export const PRODUCT_STATUS_FILTERS = ['active', 'inactive', 'all'] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number];

export class ProductListQueryDto extends OptionalPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORT_FIELDS })
  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sortBy?: ProductSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    enum: PRODUCT_STATUS_FILTERS,
    description:
      'active (default), inactive or all. Only owner/manager/inventory may list inactive products; other roles always get active ones.',
  })
  @IsOptional()
  @IsIn(PRODUCT_STATUS_FILTERS)
  status?: ProductStatusFilter;
}

export class StockListQueryDto extends OptionalPageQueryDto {}

export class CategoryListQueryDto {
  @ApiPropertyOptional({ description: 'Include deactivated categories (manager/owner only)' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeInactive?: boolean;
}

export class CostHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

export class OutletProductIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  productIds!: string[];
}

/** Target fields an XLSX column may be mapped to. */
export const XLSX_IMPORT_FIELDS = [
  'name',
  'sku',
  'price',
  'basePrice',
  'costPrice',
  'description',
  'unit',
  'category',
] as const;

export class ImportXlsxDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  sheetName!: string;

  @ApiProperty({ description: 'JSON array of { excelColumn, field }' })
  @IsString()
  @MaxLength(20_000)
  mappings!: string;
}
