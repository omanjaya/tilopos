import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthGoogleTokenDto {
  @ApiProperty({
    description: 'Google ID token obtained from client-side Google Sign-In',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export interface GoogleOAuthProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
}
