import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { NotificationChannel, NotificationType } from '@prisma/client';

/** Known alert thresholds; unknown keys are rejected by the global ValidationPipe. */
export class NotificationThresholdDto {
  @ApiPropertyOptional({ description: 'Low stock: alert at or below this quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Large transaction / refund: amount in rupiah' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000_000)
  amount?: number;

  @ApiPropertyOptional({ description: 'Shift reminder: minutes before the shift' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  minutesBefore?: number;
}

export class CreateNotificationSettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;

  @ApiPropertyOptional({ type: NotificationThresholdDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationThresholdDto)
  threshold?: NotificationThresholdDto;
}

export class UpdateNotificationSettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ type: NotificationThresholdDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationThresholdDto)
  threshold?: NotificationThresholdDto;
}

export class NotificationLogsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
