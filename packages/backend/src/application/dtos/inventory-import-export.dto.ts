import { IsString, IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';

/** Max size of an inline CSV/JSON import payload (~2 MB) and max rows per import. */
export const MAX_IMPORT_PAYLOAD_CHARS = 2_000_000;
export const MAX_IMPORT_ROWS = 5000;
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportProductsDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiProperty({ description: 'CSV content string or JSON array string (max 5000 rows)' })
  @IsString()
  @MaxLength(MAX_IMPORT_PAYLOAD_CHARS)
  data!: string;
}

export class ExportProductsQueryDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class StockDiscrepancyQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;
}

export class AutoRequestTransferDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty()
  @IsUUID()
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
