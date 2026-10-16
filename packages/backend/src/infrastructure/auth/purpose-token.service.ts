import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { purposeSecret, TokenPurpose } from './access-token';

/**
 * Signs and verifies special-purpose tokens (MFA step-up, email verification)
 * with a secret derived per purpose. These tokens can never be used as access
 * tokens, and an access token can never be used as one of them.
 */
@Injectable()
export class PurposeTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  sign<T extends object>(
    purpose: TokenPurpose,
    claims: T,
    expiresIn: `${number}${'s' | 'm' | 'h' | 'd'}`,
  ): string {
    return this.jwtService.sign({ ...claims, purpose } as Record<string, unknown>, {
      secret: this.secretFor(purpose),
      expiresIn,
    });
  }

  verify<T extends object>(purpose: TokenPurpose, token: string): T & { sub: string } {
    let payload: T & { sub: string; purpose?: string };
    try {
      payload = this.jwtService.verify(token, { secret: this.secretFor(purpose) });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.purpose !== purpose || !payload.sub) {
      throw new UnauthorizedException('Invalid token purpose');
    }
    return payload;
  }

  private secretFor(purpose: TokenPurpose): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is required');
    }
    return purposeSecret(secret, purpose);
  }
}
