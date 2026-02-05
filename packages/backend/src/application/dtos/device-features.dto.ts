import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== App Version DTOs ====================

export class AppVersionDto {
  @ApiProperty({ description: 'Semantic version string (e.g., 1.2.0)' })
  @IsString()
  version!: string;

  @ApiProperty({
    enum: ['android', 'ios', 'windows', 'web'],
    description: 'Target platform for this version',
  })
  @IsEnum(['android', 'ios', 'windows', 'web'])
  platform!: 'android' | 'ios' | 'windows' | 'web';

  @ApiPropertyOptional({ description: 'Release notes / changelog' })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({ description: 'Download URL for the update binary' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({ description: 'Minimum required version (devices below this must update)' })
  @IsOptional()
  @IsString()
  minRequired?: string;

  @ApiPropertyOptional({ description: 'Whether this update should be forced on all devices' })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;
}

export class PublishVersionDto {
  @ApiProperty({ description: 'Semantic version string (e.g., 1.2.0)' })
  @IsString()
  version!: string;

  @ApiProperty({
    enum: ['android', 'ios', 'windows', 'web'],
    description: 'Target platform',
  })
  @IsEnum(['android', 'ios', 'windows', 'web'])
  platform!: 'android' | 'ios' | 'windows' | 'web';

  @ApiPropertyOptional({ description: 'Release notes / changelog' })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({ description: 'Download URL for the update binary' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({ description: 'Whether this update is forced (all devices must update)' })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;
}

export class DeviceUpdateStatusDto {
  @ApiProperty({ description: 'Device ID' })
  @IsUUID()
  deviceId!: string;

  @ApiPropertyOptional({ description: 'Current app version on the device' })
  @IsOptional()
  @IsString()
  currentVersion?: string;

  @ApiProperty({ description: 'Whether an update is available' })
  @IsBoolean()
  updateAvailable!: boolean;

  @ApiPropertyOptional({ description: 'Last time the device checked for updates' })
  @IsOptional()
  lastChecked?: Date;
}

export class DeviceUpdateAckDto {
  @ApiProperty({ description: 'Version that was installed' })
  @IsString()
  version!: string;
}
