import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Ingredient DTOs ====================

export class CreateIngredientDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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

  @ApiProperty({ type: Number })
  @IsNumber()
  quantity!: number; // Can be positive (add) or negative (deduct)

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ==================== Recipe DTOs ====================

export class RecipeItemDto {
  @ApiProperty()
  @IsUUID()
  ingredientId!: string;

  @ApiProperty({ type: Number })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty()
  @IsString()
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
  notes?: string;

  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}

export class UpdateRecipeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [RecipeItemDto] })
  @IsOptional()
  @IsArray()
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
