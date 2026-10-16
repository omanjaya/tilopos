import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  IsNotEmpty,
  NotEquals,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Ingredient DTOs ====================

export class CreateIngredientDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  unit!: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustIngredientStockDto {
  @ApiProperty()
  @IsUUID()
  ingredientId!: string;

  @ApiPropertyOptional({
    description: "Outlet to adjust. Defaults to the caller's assigned outlet.",
  })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ type: Number, description: 'Positive adds, negative deducts; never 0' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @NotEquals(0)
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ==================== Recipe DTOs ====================

export class RecipeItemDto {
  @ApiProperty()
  @IsUUID()
  ingredientId!: string;

  @ApiProperty({ type: Number })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1_000_000)
  quantity!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;
}

export class CreateRecipeDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}

export class UpdateRecipeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ type: [RecipeItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items?: RecipeItemDto[];
}

export class RecipeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

// ==================== Response DTOs ====================

export class IngredientResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  sku?: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty({ type: Number })
  costPerUnit!: number;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class IngredientStockResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  outletId!: string;

  @ApiProperty()
  ingredientId!: string;

  @ApiProperty({ type: Number })
  quantity!: number;

  @ApiProperty({ type: Number })
  lowStockAlert!: number;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  ingredient?: IngredientResponseDto;
}

export class RecipeItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ingredientId!: string;

  @ApiProperty({ type: Number })
  quantity!: number;

  @ApiProperty()
  unit!: string;
}

export class RecipeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  variantId?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [RecipeItemResponseDto] })
  items!: RecipeItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ==================== Query DTOs ====================

/** GET /ingredients: plain array; `page`/`limit` (max 100) are optional. */
export class IngredientListQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class IngredientStockQueryDto {
  @ApiPropertyOptional({ description: 'Only rows at or below their low-stock alert' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  lowOnly?: boolean;
}
