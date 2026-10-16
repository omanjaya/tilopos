import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockOpnameStatus } from '@prisma/client';
import { MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';

/** Upper bound for items in one opname (R13). */
export const MAX_OPNAME_ITEMS = 5000;

export class CreateStockOpnameDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ description: 'Product IDs to include. If empty, all tracked products.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_OPNAME_ITEMS)
  @IsUUID('all', { each: true })
  productIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateOpnameItemDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1_000_000_000)
  actualQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateOpnameItemsDto {
  @ApiProperty({ type: [UpdateOpnameItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_OPNAME_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => UpdateOpnameItemDto)
  items!: UpdateOpnameItemDto[];
}

/**
 * GET /inventory/stock-opname. The response stays a plain array (newest first);
 * `limit` (default and max 100) and `page` select the window.
 */
export class ListStockOpnameQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ enum: StockOpnameStatus })
  @IsOptional()
  @IsEnum(StockOpnameStatus)
  status?: StockOpnameStatus;

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
