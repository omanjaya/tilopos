import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import { corsOrigins } from '../../config/cors';
import { RefreshSessionService } from './refresh-session.service';

const COOKIE = 'tilopos_refresh';
const OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/v1/auth',
};
type LoginResult = {
  accessToken: string;
  employeeId: string;
  businessId: string;
  outletId: string | null;
};

@Injectable()
export class SessionCookieService {
  constructor(
    private readonly sessions: RefreshSessionService,
    private readonly config: ConfigService,
  ) {}

  assertRequest(req: Request): void {
    // A cross-origin form cannot send this custom header. Browser fetches must
    // pass CORS preflight, and Origin is checked again on the actual mutation.
    const origin = req.headers.origin;
    const allowed = corsOrigins(
      this.config.get<string>('CORS_ORIGIN'),
      this.config.get<string>('NODE_ENV'),
    );
    if (
      req.headers['x-tilopos-session'] !== '1' ||
      (origin !== undefined && !allowed.includes(origin))
    ) {
      throw new ForbiddenException('Untrusted session request');
    }
  }

  async attach<T extends LoginResult | { requiresMfa: true; mfaToken: string }>(
    result: T,
    req: Request,
    res: Response,
  ): Promise<T> {
    res.setHeader('Cache-Control', 'no-store');
    if (!('accessToken' in result)) return result;
    // A successful login replaces the browser's previous session.
    await this.sessions.revoke(this.read(req));
    const session = await this.sessions.create(result);
    this.write(res, session);
    return { ...result, accessToken: session.accessToken };
  }

  async refresh(req: Request, res: Response) {
    this.assertRequest(req);
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { refreshToken, expiresAt, ...result } = await this.sessions.rotate(this.read(req));
      this.write(res, { refreshToken, expiresAt });
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) res.clearCookie(COOKIE, OPTIONS);
      throw error;
    }
  }

  async logout(req: Request, res: Response): Promise<{ success: true }> {
    this.assertRequest(req);
    await this.sessions.revoke(this.read(req));
    res.clearCookie(COOKIE, OPTIONS);
    res.setHeader('Cache-Control', 'no-store');
    return { success: true };
  }

  private read(req: Request): string | undefined {
    // Tokens are unescaped base64url; never parse arbitrary JSON or trust a
    // client-provided session/tenant identifier to revoke a family.
    return req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);
  }

  private write(res: Response, session: { refreshToken: string; expiresAt: Date }): void {
    res.cookie(COOKIE, session.refreshToken, { ...OPTIONS, expires: session.expiresAt });
  }
}
