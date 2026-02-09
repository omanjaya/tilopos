import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  Matches,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @Length(2, 100)
  ownerName!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
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
  phone?: string;

  @ApiProperty({ example: 'fnb_restaurant' })
  @IsString()
  businessType!: string;

  @ApiProperty({ example: 'Restoran Padang Jaya' })
  @IsString()
  @Length(2, 255)
  businessName!: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1' })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiProperty({ example: 'Outlet Utama' })
  @IsString()
  @Length(2, 255)
  outletName!: string;

  @ApiPropertyOptional({ example: 'OTL-001' })
  @IsOptional()
  @IsString()
  outletCode?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 1' })
  @IsOptional()
  @IsString()
  outletAddress?: string;

  @ApiPropertyOptional({ example: 11, description: 'Tax rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}
