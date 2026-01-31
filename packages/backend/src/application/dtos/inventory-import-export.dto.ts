import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportProductsDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiProperty({ description: 'CSV content string or JSON array string' })
  @IsString()
  data!: string;
}

export class ExportProductsQueryDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class StockDiscrepancyQueryDto {
  @ApiProperty()
  @IsString()
  outletId!: string;
}

export class AutoRequestTransferDto {
  @ApiProperty()
  @IsString()
  outletId!: string;

  @ApiProperty()
  @IsString()
  sourceOutletId!: string;
}

export interface ImportProductRow {
  name: string;
  sku?: string;
  categoryId?: string;
  basePrice: number;
  costPrice?: number;
  description?: string;
}

export interface ImportResultError {
  row: number;
  field: string;
  message: string;
}

export interface ImportProductsResult {
  imported: number;
  failed: number;
  errors: ImportResultError[];
}

export interface StockDiscrepancyItem {
  productId: string;
  productName: string;
  expectedQuantity: number;
  actualQuantity: number;
  discrepancy: number;
  lastAdjusted: Date | null;
}

export interface AutoRequestTransferResult {
  transferId: string;
  itemCount: number;
}
