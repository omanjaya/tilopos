import { RefreshSessionService } from '@modules/auth/refresh-session.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { AuthUser } from './auth-user.interface';
import { AccessTokenPayload, toAuthUser } from './access-token';

const ACTIVE_CACHE_TTL_SECONDS = 60;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessions: RefreshSessionService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    const user = toAuthUser(payload);
    await this.sessions.assertActive(payload);
    await this.assertStillActive(user);
    return user;
  }

  /**
   * Tokens outlive role changes and deactivation, so re-check the employee
   * (cached briefly to avoid a DB hit per request).
   */
  private async assertStillActive(user: AuthUser): Promise<void> {
    const cacheKey = `auth:active:${user.employeeId}`;
    let state: { isActive: boolean; role: string; businessId: string } | null = null;
    try {
      state = await this.redis.get(cacheKey);
    } catch {
      // intentionally ignored: cache unavailable, fall through to the database
    }
    if (!state) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: { isActive: true, role: true, businessId: true },
      });
      if (!employee) {
        throw new UnauthorizedException('Account not found');
      }
      state = { isActive: employee.isActive, role: employee.role, businessId: employee.businessId };
      try {
        await this.redis.set(cacheKey, state, ACTIVE_CACHE_TTL_SECONDS);
      } catch {
        // intentionally ignored: cache unavailable
      }
    }
    if (!state.isActive || state.role !== user.role || state.businessId !== user.businessId) {
      throw new UnauthorizedException('Session is no longer valid');
    }
  }
}
