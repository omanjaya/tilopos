import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ enum: ['set', 'increment', 'decrement'] })
  @IsEnum(['set', 'increment', 'decrement'])
  adjustmentType!: 'set' | 'increment' | 'decrement';

  @ApiProperty({ description: '> 0 for increment/decrement; >= 0 for set' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1_000_000_000)
  quantity!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Unit cost for moving average calculation (only used with increment)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000_000)
  unitCost?: number;
}
