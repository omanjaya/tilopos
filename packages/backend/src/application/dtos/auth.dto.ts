import { IsString, IsOptional, IsEmail, IsPhoneNumber, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@tilopos.id' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  pin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outletId?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+6281234567890' })
  @IsOptional()
  @IsString()
  @IsPhoneNumber('ID')
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({
    example: { language: 'id', timezone: 'asia-jakarta', currencyFormat: 'dot' },
    description: 'User preferences as JSON object'
  })
  @IsOptional()
  preferences?: Record<string, unknown>;
}

export class ChangePinDto {
  @ApiProperty({ example: '123456', description: 'Current 6-digit PIN' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  currentPin!: string;

  @ApiProperty({ example: '654321', description: 'New 6-digit PIN' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  newPin!: string;
}
