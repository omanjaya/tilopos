import {
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsIn,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
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
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  productIds!: string[];

  @ApiProperty({ enum: BulkUpdateAction })
  @IsEnum(BulkUpdateAction)
  action!: BulkUpdateAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: ['increase', 'decrease'] })
  @IsOptional()
  @IsIn(['increase', 'decrease'])
  operation?: 'increase' | 'decrease';

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  priceType?: 'percentage' | 'fixed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
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
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  productIds!: string[];

  @ApiPropertyOptional({
    description: 'If true, hard-deletes products (only if no transaction history)',
  })
  @IsOptional()
  @IsBoolean()
  hardDelete?: boolean;
}
