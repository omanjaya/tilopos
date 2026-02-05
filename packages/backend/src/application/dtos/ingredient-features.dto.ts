import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsUUID,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Ingredient Import/Export DTOs ====================

export class IngredientImportItemDto {
  @ApiProperty({ description: 'Ingredient name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Unit of measurement (e.g., kg, liter, pcs)' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ description: 'Cost per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional({ description: 'Minimum stock level for alerts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ description: 'Supplier ID to associate with' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'SKU code' })
  @IsOptional()
  @IsString()
  sku?: string;
}

export class IngredientImportDto {
  @ApiProperty({ enum: ['csv', 'json'], description: 'Import data format' })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiProperty({
    type: [IngredientImportItemDto],
    description:
      'Array of ingredients to import (for JSON format). For CSV, this is the parsed data.',
  })
  @IsArray()
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
  @IsBoolean()
  @Type(() => Boolean)
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

// ==================== Recipe Cost History DTOs ====================

export class RecipeCostHistoryQueryDto {
  @ApiProperty({ description: 'Recipe ID to track cost history' })
  @IsUUID()
  recipeId!: string;

  @ApiPropertyOptional({ description: 'Start date for cost history range (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for cost history range (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
