import { IsString, IsNotEmpty, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({
    description: 'TOTP verification token (6-digit code)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'token must be 6 digits' })
  token!: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    description: 'TOTP verification token (6-digit code)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'token must be 6 digits' })
  token!: string;

  @ApiProperty({
    description: 'Short-lived MFA JWT token received after credential verification',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  mfaToken!: string;
}

export class DisableMfaDto {
  @ApiProperty({
    description: 'Current TOTP token to confirm MFA disable',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'token must be 6 digits' })
  token!: string;

  @ApiProperty({ description: 'Current PIN (re-authentication)', example: '123456' })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'PIN must be 4-8 digits' })
  pin!: string;
}
