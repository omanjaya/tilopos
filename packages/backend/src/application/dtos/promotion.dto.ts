import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const DISCOUNT_TYPES = ['percentage', 'fixed', 'bogo'] as const;
export type PromotionDiscountType = (typeof DISCOUNT_TYPES)[number];
const MAX_MONEY = 1_000_000_000_000;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Restrictions evaluated by PromotionRulesEngine (all optional; empty = no restriction). */
export class PromotionApplicableToDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  outlets?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  customerSegments?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  categoryIds?: string[];
}

export class CreatePromotionDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: DISCOUNT_TYPES })
  @IsEnum(DISCOUNT_TYPES)
  discountType!: PromotionDiscountType;

  @ApiProperty({ minimum: 0, description: 'Percent (0-100) for percentage, rupiah otherwise' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  discountValue!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  minPurchase?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  maxDiscount?: number;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  @IsISO8601({ strict: true })
  validFrom!: string;

  @ApiProperty({ description: 'ISO 8601 timestamp' })
  @IsISO8601({ strict: true })
  validUntil!: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  usageLimit?: number;

  @ApiPropertyOptional({ type: PromotionApplicableToDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PromotionApplicableToDto)
  applicableTo?: PromotionApplicableToDto;
}

/**
 * PUT /promotions/:id. Only editable fields; `null` clears an optional field.
 * businessId, usedCount and isActive are never client-writable (R7).
 */
export class UpdatePromotionDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsEnum(DISCOUNT_TYPES)
  discountType?: PromotionDiscountType;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  discountValue?: number;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  minPurchase?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  maxDiscount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  validUntil?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  usageLimit?: number | null;

  @ApiPropertyOptional({ type: PromotionApplicableToDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PromotionApplicableToDto)
  applicableTo?: PromotionApplicableToDto;
}

export class GenerateVouchersDto {
  @ApiProperty({ description: '2-10 uppercase letters/digits' })
  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'prefix must be 2-10 uppercase alphanumeric characters' })
  prefix!: string;

  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ApiProperty({ enum: DISCOUNT_TYPES })
  @IsEnum(DISCOUNT_TYPES)
  discountType!: PromotionDiscountType;

  @ApiProperty({ minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  discountValue!: number;

  @ApiProperty()
  @IsISO8601({ strict: true })
  validFrom!: string;

  @ApiProperty()
  @IsISO8601({ strict: true })
  validTo!: string;

  @ApiProperty({ minimum: 1, description: 'Usage limit of the parent promotion' })
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  usageLimit!: number;
}

export class VoucherListQueryDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}

export class ValidateVoucherDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ minimum: 0, description: 'Cart subtotal (preview only; checkout re-validates)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  total!: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class UseVoucherDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class ApplyPromotionItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(1_000_000)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Ignored: prices are loaded server-side' })
  @IsOptional()
  @IsNumber()
  price?: number;
}

export class ApplyPromotionDto {
  @ApiProperty({ type: [ApplyPromotionItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ApplyPromotionItemDto)
  items!: ApplyPromotionItemDto[];

  @ApiPropertyOptional({ description: 'Ignored: total is computed from server prices' })
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  promotionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
