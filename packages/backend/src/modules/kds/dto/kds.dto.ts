import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const KITCHEN_STATIONS = [
  'grill',
  'fryer',
  'cold',
  'hot',
  'drinks',
  'dessert',
  'general',
] as const;
export type KitchenStationValue = (typeof KITCHEN_STATIONS)[number];

export const KDS_ITEM_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'] as const;
export const KDS_PRIORITIES = ['normal', 'urgent', 'vip'] as const;

const toBoolean = ({ value }: { value: unknown }): boolean =>
  value === true || value === 'true' || value === '1';

/** Every KDS read is for exactly one outlet (verified with TenantAccessService). */
export class KdsOutletQueryDto {
  @ApiProperty()
  @IsUUID()
  outletId!: string;
}

export class KdsOrdersQueryDto extends KdsOutletQueryDto {
  @ApiPropertyOptional({ enum: KITCHEN_STATIONS })
  @IsOptional()
  @IsIn(KITCHEN_STATIONS)
  station?: KitchenStationValue;

  @ApiPropertyOptional({ enum: KDS_ITEM_STATUSES })
  @IsOptional()
  @IsIn(KDS_ITEM_STATUSES)
  status?: (typeof KDS_ITEM_STATUSES)[number];

  @ApiPropertyOptional({ enum: KDS_PRIORITIES })
  @IsOptional()
  @IsIn(KDS_PRIORITIES)
  priority?: (typeof KDS_PRIORITIES)[number];

  @ApiPropertyOptional({ description: "Include today's served/cancelled items" })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeCompleted?: boolean;
}

export class KdsAnalyticsQueryDto extends KdsOutletQueryDto {
  @ApiPropertyOptional({ description: 'Business date YYYY-MM-DD (Asia/Jakarta), default today' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

export class KdsPerformanceQueryDto extends KdsOutletQueryDto {
  @ApiPropertyOptional({ description: 'ISO date/time, default start of today (Asia/Jakarta)' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO date/time, default now' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;
}

export class BumpOrderDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  /** Accepted for backward compatibility; the item's own station is used. */
  @ApiPropertyOptional({ enum: KITCHEN_STATIONS })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  station?: string;
}

export class MarkItemPreparingDto {
  @ApiPropertyOptional({ enum: KITCHEN_STATIONS })
  @IsOptional()
  @IsIn(KITCHEN_STATIONS)
  station?: KitchenStationValue;
}

export class RecallItemDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class CookingTimerSettingsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  dineIn?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  takeaway?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 240 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  delivery?: number;
}
