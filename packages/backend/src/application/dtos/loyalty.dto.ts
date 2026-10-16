import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

/** Upper bound for a single points movement (sanity limit, not a business rule). */
export const MAX_POINTS_PER_OPERATION = 10_000_000;

/**
 * Earn points for a completed sale. The points are always computed from the
 * transaction's grandTotal stored in the DB (R8) — the client never sends an amount.
 */
export class EarnLoyaltyPointsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ format: 'uuid', description: 'Completed sale transaction of this business' })
  @IsUUID()
  transactionId!: string;
}

/** Same as EarnLoyaltyPointsDto but the customer comes from the route. */
export class EarnCustomerLoyaltyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  transactionId!: string;
}

export class RedeemLoyaltyPointsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(MAX_POINTS_PER_OPERATION)
  pointsToRedeem!: number;
}

/** Same as RedeemLoyaltyPointsDto but the customer comes from the route. */
export class RedeemCustomerLoyaltyDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(MAX_POINTS_PER_OPERATION)
  pointsToRedeem!: number;
}

export class AdjustLoyaltyPointsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Positive to add, negative to deduct' })
  @IsInt()
  @NotEquals(0)
  @Min(-MAX_POINTS_PER_OPERATION)
  @Max(MAX_POINTS_PER_OPERATION)
  points!: number;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class LoyaltyHistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LoyaltyAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Period start (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Period end (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
