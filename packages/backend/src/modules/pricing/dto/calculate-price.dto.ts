import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculatePriceDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  originalPrice!: number;

  @IsOptional()
  @IsString()
  customerSegment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cartTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cartItemCount?: number;
}

export class BatchPriceItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  originalPrice!: number;
}

export class CalculateBatchPriceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchPriceItemDto)
  items!: BatchPriceItemDto[];

  @IsOptional()
  @IsString()
  customerSegment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cartTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cartItemCount?: number;
}
