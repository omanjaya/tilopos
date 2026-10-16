import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SessionCookieService } from '../session-cookie.service';
import type { RefreshSessionService } from '../refresh-session.service';

describe('SessionCookieService', () => {
  const sessions = { create: jest.fn(), revoke: jest.fn(), rotate: jest.fn() };
  const service = new SessionCookieService(
    sessions as unknown as RefreshSessionService,
    new ConfigService({ CORS_ORIGIN: 'https://pos.example.com, https://admin.example.com' }),
  );
  const req = (origin?: string, header = '1') =>
    ({ headers: { origin, 'x-tilopos-session': header } }) as unknown as Request;

  it('requires the non-simple header even when Origin is absent', () => {
    expect(() => service.assertRequest(req(undefined, ''))).toThrow();
    expect(() => service.assertRequest(req())).not.toThrow();
  });
  it('rejects untrusted and null origins', () => {
    expect(() => service.assertRequest(req('https://evil.example.com'))).toThrow();
    expect(() => service.assertRequest(req('null'))).toThrow();
    expect(() => service.assertRequest(req('https://admin.example.com'))).not.toThrow();
  });
  it('only issues a cookie after MFA is completed', async () => {
    const response = { cookie: jest.fn(), setHeader: jest.fn() } as unknown as Response;
    const result = { requiresMfa: true as const, mfaToken: 'challenge' };
    expect(await service.attach(result, req(), response)).toEqual(result);
    expect(sessions.create).not.toHaveBeenCalled();
  });
  it('keeps raw refresh tokens out of the response body', async () => {
    sessions.create.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'opaque',
      expiresAt: new Date(Date.now() + 10000),
    });
    const cookie = jest.fn();
    const response = { cookie, setHeader: jest.fn() } as unknown as Response;
    const result = await service.attach(
      { accessToken: 'old', employeeId: 'e', businessId: 'b', outletId: null },
      req(),
      response,
    );
    expect(result).not.toHaveProperty('refreshToken');
    expect(cookie).toHaveBeenCalledWith(
      'tilopos_refresh',
      'opaque',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/v1/auth',
      }),
    );
  });
});
