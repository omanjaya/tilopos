import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkUpdateAction {
  CATEGORY = 'category',
  PRICE = 'price',
  COST_PRICE = 'costPrice',
  STATUS = 'status',
  TRACK_STOCK = 'trackStock',
}

export class BulkUpdateProductsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  productIds!: string[];

  @ApiProperty({ enum: BulkUpdateAction })
  @IsEnum(BulkUpdateAction)
  action!: BulkUpdateAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: ['increase', 'decrease'] })
  @IsOptional()
  @IsString()
  operation?: 'increase' | 'decrease';

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsString()
  priceType?: 'percentage' | 'fixed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;
}

export class BulkDeleteProductsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  productIds!: string[];

  @ApiPropertyOptional({ description: 'If true, hard-deletes products (only if no transaction history)' })
  @IsOptional()
  @IsBoolean()
  hardDelete?: boolean;
}
