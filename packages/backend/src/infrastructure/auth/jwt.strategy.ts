import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from './auth-user.interface';

interface JwtPayload {
  sub: string;
  businessId: string;
  outletId: string | null;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get('JWT_SECRET') || 'default-secret-key';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      employeeId: payload.sub,
      businessId: payload.businessId,
      outletId: payload.outletId,
      role: payload.role,
    };
  }
}
