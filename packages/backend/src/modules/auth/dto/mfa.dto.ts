import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({
    description: 'TOTP verification token (6-digit code)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
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
  token!: string;

  @ApiProperty({
    description: 'Short-lived MFA JWT token received after credential verification',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
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
  token!: string;
}
