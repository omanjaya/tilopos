import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  Matches,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Digits with optional leading + and common separators, 6-20 chars. */
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,19}$/;

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @Length(2, 100)
  ownerName!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit PIN' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  pin!: string;

  @ApiProperty({ example: '123456', description: 'Must match PIN' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Confirm PIN must be exactly 6 digits' })
  confirmPin!: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiProperty({ example: 'fnb_restaurant' })
  @IsString()
  @MaxLength(50)
  businessType!: string;

  @ApiProperty({ example: 'Restoran Padang Jaya' })
  @IsString()
  @Length(2, 255)
  businessName!: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'businessPhone must be a valid phone number' })
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessAddress?: string;

  @ApiProperty({ example: 'Outlet Utama' })
  @IsString()
  @Length(2, 255)
  outletName!: string;

  @ApiPropertyOptional({ example: 'OTL-001' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'outletCode may only contain letters, digits, - and _' })
  outletCode?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  outletAddress?: string;

  @ApiPropertyOptional({ example: 11, description: 'Tax rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}
