import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StoreOrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '@shared/dtos/pagination-query.dto';

/** Upper bound for a single storefront line quantity. */
export const MAX_STOREFRONT_QTY = 999;
/** Upper bound for the number of lines in one storefront order. */
export const MAX_STOREFRONT_LINES = 50;
/** Rupiah amounts accepted in store settings. */
const MAX_MONEY = 1_000_000_000;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,18}$/;
const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// ============================================================================
// Store management
// ============================================================================

export class CreateOnlineStoreDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  storeName!: string;

  @ApiProperty({ description: 'URL slug: lowercase letters, digits and dashes (3-50 chars)' })
  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,48})[a-z0-9]$/, {
    message: 'slug must be 3-50 chars of lowercase letters, digits and dashes',
  })
  slug!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class StoreOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StoreOrderStatus })
  @IsOptional()
  @IsEnum(StoreOrderStatus)
  status?: StoreOrderStatus;
}

export class UpdateStoreOrderStatusDto {
  @ApiProperty({ enum: StoreOrderStatus })
  @IsEnum(StoreOrderStatus)
  status!: StoreOrderStatus;
}

export class CatalogSyncQueryDto {
  @ApiProperty({ description: 'Online store id' })
  @IsUUID()
  storeId!: string;
}

export class SyncInventoryQueryDto {
  @ApiProperty({ description: 'Outlet whose stock is published' })
  @IsUUID()
  outletId!: string;
}

export class StoreSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  deliveryRadius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_MONEY)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_MONEY)
  deliveryFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_MONEY)
  freeDeliveryThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDeliveryEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPickupEnabled?: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(HHMM_PATTERN, { message: 'operatingHoursStart must be HH:mm' })
  operatingHoursStart?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsOptional()
  @Matches(HHMM_PATTERN, { message: 'operatingHoursEnd must be HH:mm' })
  operatingHoursEnd?: string;

  /** Distance-based shipping is not supported (no geocoding provider). */
  @ApiPropertyOptional({ enum: ['flat_rate', 'free'] })
  @IsOptional()
  @IsIn(['flat_rate', 'free'])
  shippingMode?: 'flat_rate' | 'free';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_MONEY)
  flatRateAmount?: number;

  @ApiPropertyOptional({ description: 'Outlet that fulfils storefront orders (stock source)' })
  @IsOptional()
  @IsUUID()
  fulfillmentOutletId?: string;
}

// ============================================================================
// Public storefront checkout
// ============================================================================

export class StorefrontOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1, maximum: MAX_STOREFRONT_QTY })
  @IsInt()
  @Min(1)
  @Max(MAX_STOREFRONT_QTY)
  quantity!: number;
}

export class StorefrontOrderDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerName!: string;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @MaxLength(20)
  @Matches(PHONE_PATTERN, { message: 'customerPhone must be a valid phone number' })
  customerPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shippingAddress?: string;

  @ApiPropertyOptional({ enum: ['delivery', 'pickup'] })
  @IsOptional()
  @IsIn(['delivery', 'pickup'])
  shippingMethod?: 'delivery' | 'pickup';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [StorefrontOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_STOREFRONT_LINES)
  @ValidateNested({ each: true })
  @Type(() => StorefrontOrderItemDto)
  items!: StorefrontOrderItemDto[];
}

export class StorefrontStockCheckQueryDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_STOREFRONT_QTY)
  quantity!: number;
}

export class StoreShippingCalculateDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  destination!: string;

  @ApiPropertyOptional({ description: 'Order subtotal (for free-delivery threshold)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_MONEY)
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Total weight in grams' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  weight?: number;
}

// ============================================================================
// Catalog Sync
// ============================================================================

export class PriceOverrideItem {
  @ApiProperty({ description: 'Product ID to override price for' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Overridden online price' })
  @IsNumber()
  @Min(0)
  onlinePrice!: number;
}

export class CatalogSyncDto {
  @ApiProperty({ description: 'Product IDs to sync to online store', type: [String] })
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  productIds!: string[];

  @ApiPropertyOptional({
    description: 'Optional price overrides for specific products',
    type: [PriceOverrideItem],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => PriceOverrideItem)
  priceOverrides?: PriceOverrideItem[];
}

// ============================================================================
// Shipping Calculator
// ============================================================================

export class ShippingItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ description: 'Variant ID' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ description: 'Quantity' })
  @IsInt()
  @Min(1)
  @Max(MAX_STOREFRONT_QTY)
  quantity!: number;
}

export class ShippingCalculateDto {
  @ApiProperty({ description: 'Origin city/region' })
  @IsString()
  @MaxLength(255)
  origin!: string;

  @ApiProperty({ description: 'Destination city/region' })
  @IsString()
  @MaxLength(255)
  destination!: string;

  @ApiProperty({ description: 'Total weight in grams' })
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  weight!: number;

  @ApiPropertyOptional({ description: 'Items being shipped', type: [ShippingItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STOREFRONT_LINES)
  @ValidateNested({ each: true })
  @Type(() => ShippingItemDto)
  items?: ShippingItemDto[];
}

// ============================================================================
// Order Fulfillment
// ============================================================================

export class OnlineOrderFulfillDto {
  @ApiProperty({ description: 'Tracking number from shipping provider' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  trackingNumber!: string;

  @ApiProperty({ description: 'Shipping provider name (e.g., JNE, SiCepat, GoSend)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  shippingProvider!: string;

  @ApiPropertyOptional({ description: 'Notes about the shipment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
