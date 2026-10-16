import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthGoogleTokenDto {
  @ApiProperty({
    description: 'Google ID token obtained from client-side Google Sign-In',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken!: string;
}

export interface GoogleOAuthProfile {
  googleId: string;
  email: string;
  /** Google's email_verified claim; only verified addresses may be matched. */
  emailVerified: boolean;
  name: string;
  picture: string | null;
}
