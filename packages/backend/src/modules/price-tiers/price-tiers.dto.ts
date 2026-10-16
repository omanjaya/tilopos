import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MAX_PRICE = 1_000_000_000_000;

export class PriceTierFieldsDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tierName!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  minQuantity!: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxQuantity?: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  price!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;
}

export class CreatePriceTierDto extends PriceTierFieldsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;
}

export class UpdatePriceTierDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tierName?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  minQuantity?: number;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxQuantity?: number | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  price?: number;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkPriceTiersDto {
  @ApiProperty({ type: [PriceTierFieldsDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PriceTierFieldsDto)
  tiers!: PriceTierFieldsDto[];
}

export class ResolvePriceQueryDto {
  @ApiPropertyOptional({ minimum: 0.001, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(1_000_000)
  quantity?: number;
}
