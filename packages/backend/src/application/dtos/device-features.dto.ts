import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsIn,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SEMVER = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const PLATFORMS = ['android', 'ios', 'windows', 'web'] as const;
const DEVICE_TYPES = ['tablet', 'phone', 'desktop', 'kds_display'] as const;

// ==================== Device DTOs ====================

export class RegisterDeviceDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceName!: string;

  @ApiProperty({ enum: DEVICE_TYPES })
  @IsIn(DEVICE_TYPES)
  deviceType!: (typeof DEVICE_TYPES)[number];

  @ApiPropertyOptional({ enum: PLATFORMS })
  @IsOptional()
  @IsIn(PLATFORMS)
  platform?: (typeof PLATFORMS)[number];

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceIdentifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

export class ListVersionsQueryDto {
  @ApiPropertyOptional({ enum: PLATFORMS })
  @IsOptional()
  @IsIn(PLATFORMS)
  platform?: (typeof PLATFORMS)[number];
}

// ==================== App Version DTOs ====================

export class PublishVersionDto {
  @ApiProperty({ description: 'Semantic version string (e.g., 1.2.0)' })
  @Matches(SEMVER, { message: 'version must be semantic (e.g. 1.2.0)' })
  version!: string;

  @ApiProperty({ enum: PLATFORMS, description: 'Target platform' })
  @IsEnum(PLATFORMS)
  platform!: (typeof PLATFORMS)[number];

  @ApiPropertyOptional({ description: 'Release notes / changelog' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  releaseNotes?: string;

  @ApiPropertyOptional({ description: 'HTTPS download URL for the update binary' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  downloadUrl?: string;

  @ApiPropertyOptional({ description: 'Whether this update is forced (all devices must update)' })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;
}

export class DeviceUpdateAckDto {
  @ApiProperty({ description: 'Version that was installed' })
  @Matches(SEMVER, { message: 'version must be semantic (e.g. 1.2.0)' })
  version!: string;
}
