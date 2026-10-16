import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsUUID,
  IsUrl,
  IsIn,
  IsBoolean,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@tilopos.id' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // 4-8 digits: new PINs are 6 digits, older accounts may still have shorter ones.
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'PIN must be 4-8 digits' })
  pin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

/** Allowed profile preference keys (mirrors web UserPreferences; no arbitrary JSON). */
export class ProfilePreferencesDto {
  @ApiPropertyOptional({ enum: ['id', 'en'] })
  @IsOptional()
  @IsIn(['id', 'en'])
  language?: string;

  @ApiPropertyOptional({ enum: ['asia-jakarta', 'asia-makassar', 'asia-jayapura'] })
  @IsOptional()
  @IsIn(['asia-jakarta', 'asia-makassar', 'asia-jayapura'])
  timezone?: string;

  @ApiPropertyOptional({ enum: ['dd/mm/yyyy', 'mm/dd/yyyy'] })
  @IsOptional()
  @IsIn(['dd/mm/yyyy', 'mm/dd/yyyy'])
  dateFormat?: string;

  @ApiPropertyOptional({ enum: ['dot', 'comma'] })
  @IsOptional()
  @IsIn(['dot', 'comma'])
  currencyFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ example: '+6281234567890' })
  @IsOptional()
  @IsString()
  @IsPhoneNumber('ID')
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsUrl(
    { protocols: ['https', 'http'], require_protocol: true, require_tld: false },
    { message: 'profilePhotoUrl must be an http(s) URL' },
  )
  profilePhotoUrl?: string;

  @ApiPropertyOptional({
    type: ProfilePreferencesDto,
    example: { language: 'id', timezone: 'asia-jakarta', currencyFormat: 'dot' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfilePreferencesDto)
  preferences?: ProfilePreferencesDto;
}

export class ChangePinDto {
  // Same length rule as LoginDto: legacy PINs of 4-5 digits must still be changeable.
  @ApiProperty({ example: '123456', description: 'Current PIN (4-8 digits)' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'PIN must be 4-8 digits' })
  currentPin!: string;

  @ApiProperty({ example: '654321', description: 'New 6-digit PIN' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  newPin!: string;
}
