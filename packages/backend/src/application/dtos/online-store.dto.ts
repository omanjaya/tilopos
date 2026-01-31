import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
  @IsUUID('4', { each: true })
  productIds!: string[];

  @ApiPropertyOptional({ description: 'Optional price overrides for specific products', type: [PriceOverrideItem] })
  @IsOptional()
  @IsArray()
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
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class ShippingCalculateDto {
  @ApiProperty({ description: 'Origin city/region' })
  @IsString()
  origin!: string;

  @ApiProperty({ description: 'Destination city/region' })
  @IsString()
  destination!: string;

  @ApiProperty({ description: 'Total weight in grams' })
  @IsNumber()
  @Min(1)
  weight!: number;

  @ApiPropertyOptional({ description: 'Items being shipped', type: [ShippingItemDto] })
  @IsOptional()
  @IsArray()
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
  trackingNumber!: string;

  @ApiProperty({ description: 'Shipping provider name (e.g., JNE, SiCepat, GoSend)' })
  @IsString()
  shippingProvider!: string;

  @ApiPropertyOptional({ description: 'Notes about the shipment' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// Shipping Zone Configuration
// ============================================================================

export enum ShippingZone {
  SAME_CITY = 'same_city',
  INTER_CITY = 'inter_city',
  INTER_PROVINCE = 'inter_province',
}

export class ShippingZoneRateDto {
  @ApiProperty({ enum: ShippingZone, description: 'Shipping zone type' })
  @IsEnum(ShippingZone)
  zone!: ShippingZone;

  @ApiProperty({ description: 'Base rate in IDR' })
  @IsNumber()
  @Min(0)
  baseRate!: number;

  @ApiProperty({ description: 'Rate per kilogram in IDR' })
  @IsNumber()
  @Min(0)
  perKgRate!: number;

  @ApiProperty({ description: 'Estimated delivery days' })
  @IsNumber()
  @Min(0)
  estimatedDays!: number;
}
