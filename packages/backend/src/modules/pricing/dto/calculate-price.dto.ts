import {
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * Price preview request. Prices, categories, stock and customer segment are
 * loaded server-side from the ids (R8). `originalPrice`, `categoryId`,
 * `customerSegment` and `stockLevel` are still accepted for backwards
 * compatibility but IGNORED.
 */
export class CalculatePriceDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Customer whose loyalty tier is used as segment' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Outlet for stock-based rules (defaults to token outlet)' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  /** Preview hint only; checkout recomputes cart conditions server-side. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999999999)
  cartTotal?: number;

  /** Preview hint only; checkout recomputes cart conditions server-side. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  cartItemCount?: number;

  /** @deprecated ignored (server price is used) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  /** @deprecated ignored (product category is used) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  /** @deprecated ignored (derived from customerId) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerSegment?: string;

  /** @deprecated ignored (read from stock levels) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsNumber()
  stockLevel?: number;
}

export class BatchPriceItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  /** @deprecated ignored (server price is used) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  /** @deprecated ignored (product category is used) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;
}

export class CalculateBatchPriceDto {
  @ApiProperty({ type: [BatchPriceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BatchPriceItemDto)
  items!: BatchPriceItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  /** @deprecated ignored (derived from customerId) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerSegment?: string;

  /** @deprecated ignored (computed from server prices) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsNumber()
  cartTotal?: number;

  /** @deprecated ignored (computed from items) */
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsInt()
  cartItemCount?: number;
}
