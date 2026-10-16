import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Ingredient Import/Export DTOs ====================

export class IngredientImportItemDto {
  @ApiProperty({ description: 'Ingredient name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Unit of measurement (e.g., kg, liter, pcs)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiPropertyOptional({ description: 'Cost per unit' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1_000_000_000)
  costPerUnit?: number;

  // minStockLevel / supplierId are intentionally NOT accepted: ingredients have no such
  // columns (low-stock alerts are per outlet stock row), so the old import silently
  // dropped them. With forbidNonWhitelisted they are now rejected with 400.

  @ApiPropertyOptional({ description: 'SKU code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;
}

export class IngredientImportDto {
  @ApiProperty({ enum: ['csv', 'json'], description: 'Import data format' })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiProperty({
    type: [IngredientImportItemDto],
    description:
      'Rows to import (max 1000). Always a parsed array; for CSV the client parses the file.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => IngredientImportItemDto)
  data!: IngredientImportItemDto[];
}

export class IngredientExportQueryDto {
  @ApiPropertyOptional({ enum: ['csv', 'json'], description: 'Export format (default: json)' })
  @IsOptional()
  @IsEnum(['csv', 'json'])
  format?: 'csv' | 'json';

  @ApiPropertyOptional({ description: 'Filter by outlet ID for stock levels' })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ description: 'Include current stock levels in export' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeStock?: boolean;
}

// ==================== Low Stock Alert DTOs ====================

export class LowStockAlertQueryDto {
  @ApiProperty({ description: 'Outlet ID to check stock levels' })
  @IsUUID()
  outletId!: string;

  @ApiPropertyOptional({ description: 'Custom threshold multiplier (default uses minStockLevel)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  threshold?: number;
}
