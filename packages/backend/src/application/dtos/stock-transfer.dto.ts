import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockTransferStatus } from '@prisma/client';
import { MAX_PAGE_SIZE, PaginationQueryDto } from '@shared/dtos/pagination-query.dto';

export const MAX_TRANSFER_ITEMS = 200;
export const MAX_TRANSFER_QUANTITY = 1_000_000;

export class DiscrepancyQueryDto {
  @ApiProperty({ description: 'YYYY-MM-DD (business day, Asia/Jakarta) or ISO timestamp' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'YYYY-MM-DD (business day, Asia/Jakarta) or ISO timestamp' })
  @IsDateString()
  to!: string;
}

export class AutoTransferRequestDto {
  @ApiProperty()
  @IsUUID()
  destinationOutletId!: string;

  @ApiProperty()
  @IsUUID()
  sourceOutletId!: string;
}

/**
 * GET /stock-transfers. The response stays a plain array (frontend contract);
 * page/limit bound the result (default and max 100).
 */
export class ListStockTransfersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StockTransferStatus })
  @IsOptional()
  @IsEnum(StockTransferStatus)
  status?: StockTransferStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  override limit?: number = MAX_PAGE_SIZE;
}

/** One line of a transfer: either a product (optionally a variant) or an ingredient. */
export class TransferItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @ApiProperty({ minimum: 0.001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(MAX_TRANSFER_QUANTITY)
  quantity!: number;
}

export class CreateStockTransferDto {
  @ApiProperty()
  @IsUUID()
  sourceOutletId!: string;

  @ApiProperty()
  @IsUUID()
  destinationOutletId!: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TRANSFER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Transfer template this transfer was created from' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

/** POST /stock-transfers/direct has the same shape as a transfer request. */
export class DirectStockTransferDto extends CreateStockTransferDto {}

export class ReceiveTransferItemDto {
  @ApiProperty()
  @IsUUID()
  stockTransferItemId!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_TRANSFER_QUANTITY)
  quantityReceived!: number;
}

/**
 * PUT /stock-transfers/:id/receive. Items omitted from `items` (or the whole
 * body omitted) are received in full (quantityReceived = quantitySent).
 */
export class ReceiveTransferDto {
  @ApiPropertyOptional({ type: [ReceiveTransferItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TRANSFER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferItemDto)
  items?: ReceiveTransferItemDto[];
}

// ---------------------------------------------------------------------------
// Transfer templates
// ---------------------------------------------------------------------------

export class TransferTemplateItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  itemName!: string;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999)
  defaultQuantity!: number;
}

export class CreateTransferTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty()
  @IsUUID()
  sourceOutletId!: string;

  @ApiProperty()
  @IsUUID()
  destinationOutletId!: string;

  @ApiProperty({ type: [TransferTemplateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TRANSFER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => TransferTemplateItemDto)
  items!: TransferTemplateItemDto[];
}

export class UpdateTransferTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceOutletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  destinationOutletId?: string;

  @ApiPropertyOptional({ type: [TransferTemplateItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TRANSFER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => TransferTemplateItemDto)
  items?: TransferTemplateItemDto[];
}
