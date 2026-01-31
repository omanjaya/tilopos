import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';
import type { GoogleOAuthProfile } from '../dto/oauth-login.dto';

/**
 * Google OAuth2 strategy placeholder.
 *
 * This uses JWT strategy under the 'google' name as a placeholder.
 * In production, install `passport-google-oauth20` and `@types/passport-google-oauth20`
 * then extend PassportStrategy(GoogleOAuth2Strategy, 'google') instead.
 *
 * The actual Google Sign-In for mobile/SPA clients is handled via
 * POST /auth/oauth/google which verifies Google ID tokens directly
 * without requiring the Passport Google strategy.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET', 'placeholder-secret');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    this.logger.warn(
      'Google OAuth strategy is using a placeholder implementation. ' +
      'Install passport-google-oauth20 for full server-side OAuth flow.',
    );
  }

  validate(payload: Record<string, unknown>): GoogleOAuthProfile {
    return {
      googleId: String(payload['sub'] ?? ''),
      email: String(payload['email'] ?? ''),
      name: String(payload['name'] ?? ''),
      picture: payload['picture'] ? String(payload['picture']) : null,
    };
  }
}
