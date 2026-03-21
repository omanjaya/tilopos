import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty()
  @IsString()
  outletId!: string;

  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ enum: ['set', 'increment', 'decrement'] })
  @IsEnum(['set', 'increment', 'decrement'])
  adjustmentType!: 'set' | 'increment' | 'decrement';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Unit cost for moving average calculation (only used with increment)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}
