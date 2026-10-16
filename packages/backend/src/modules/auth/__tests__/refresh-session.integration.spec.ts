import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import * as request from 'supertest';
import { AuthController } from '../auth.controller';
import { SessionCookieService } from '../session-cookie.service';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { RedisService } from '@infrastructure/cache/redis.service';
import { LoginUseCase } from '@application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '@application/use-cases/auth/register.use-case';
import { UpdateProfileUseCase } from '@application/use-cases/auth/update-profile.use-case';
import { ChangePinUseCase } from '@application/use-cases/auth/change-pin.use-case';
import { GetActivityLogUseCase } from '@application/use-cases/auth/get-activity-log.use-case';
import { LogAuditEventUseCase } from '@application/use-cases/audit/log-audit-event.use-case';
import { BusinessTypeService } from '@modules/business/services/business-type.service';
import { corsOrigins } from '../../../config/cors';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RefreshSessionService } from '../refresh-session.service';
import type { AccessTokenPayload } from '@infrastructure/auth/access-token';

// Only an explicitly supplied throwaway database may run these concurrency tests.
const integration = process.env.AUTH_TEST_DATABASE_URL ? describe : describe.skip;
integration('Refresh sessions (PostgreSQL)', () => {
  let db: PrismaService;
  let service: RefreshSessionService;
  let businessId: string;
  let employeeId: string;
  const jwt = new JwtService({
    secret: 'integration-only-session-secret',
    signOptions: { expiresIn: '1h' },
  });
  const identity = () => ({ businessId, employeeId, outletId: null });

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.AUTH_TEST_DATABASE_URL;
    db = new PrismaService();
    await db.$connect();
    service = new RefreshSessionService(
      db,
      jwt,
      new ConfigService({ REFRESH_TOKEN_EXPIRES_IN: '7d' }),
    );
  });
  beforeEach(async () => {
    businessId = randomUUID();
    employeeId = randomUUID();
    await db.business.create({ data: { id: businessId, name: 'Refresh integration' } });
    await db.employee.create({
      data: { id: employeeId, businessId, name: 'Owner', role: 'owner' },
    });
  });
  afterEach(async () => {
    await db.employee.deleteMany({ where: { businessId } });
    await db.business.deleteMany({ where: { id: businessId } });
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('serializes concurrent rotations and commits family revocation on reuse', async () => {
    const initial = await service.create(identity());
    const results = await Promise.allSettled([
      service.rotate(initial.refreshToken),
      service.rotate(initial.refreshToken),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const winner = results.find(
      (result) => result.status === 'fulfilled',
    ) as PromiseFulfilledResult<Awaited<ReturnType<typeof service.rotate>>>;
    await expect(service.rotate(winner.value.refreshToken)).rejects.toThrow(
      'Invalid refresh token',
    );
    await expect(
      service.assertActive(jwt.verify<AccessTokenPayload>(winner.value.accessToken)),
    ).rejects.toThrow();
  });
  it('revokes only the matching tenant and session on logout', async () => {
    const a = await service.create(identity());
    const b = await service.create(identity());
    await service.revoke(a.refreshToken);
    await expect(
      service.assertActive(jwt.verify<AccessTokenPayload>(a.accessToken)),
    ).rejects.toThrow();
    await expect(service.rotate(b.refreshToken)).resolves.toHaveProperty('accessToken');
  });
  it('binds access to its tenant and employee', async () => {
    const session = await service.create(identity());
    const claims = jwt.verify<AccessTokenPayload>(session.accessToken);
    await expect(service.assertActive({ ...claims, businessId: randomUUID() })).rejects.toThrow();
    await expect(service.assertActive({ ...claims, sub: randomUUID() })).rejects.toThrow();
  });
  it('uses the current role and refuses deactivated employees', async () => {
    const session = await service.create(identity());
    await db.employee.updateMany({
      where: { id: employeeId, businessId },
      data: { role: 'cashier' },
    });
    const rotated = await service.rotate(session.refreshToken);
    expect(jwt.verify(rotated.accessToken).role).toBe('cashier');
    await db.employee.updateMany({
      where: { id: employeeId, businessId },
      data: { isActive: false },
    });
    await expect(service.rotate(rotated.refreshToken)).rejects.toThrow();
    await expect(
      service.assertActive(jwt.verify<AccessTokenPayload>(rotated.accessToken)),
    ).rejects.toThrow();
  });
  it('serves secure cookies, rotates them and rejects the old access token after HTTP logout', async () => {
    const config = new ConfigService({
      JWT_SECRET: 'integration-only-session-secret',
      CORS_ORIGIN: 'https://pos.example.com',
    });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [
        SessionCookieService,
        JwtStrategy,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: db },
        { provide: RefreshSessionService, useValue: service },
        { provide: RedisService, useValue: { get: async () => null, set: async () => undefined } },
        {
          provide: LoginUseCase,
          useValue: {
            execute: async () => ({
              ...identity(),
              accessToken: 'replaced-by-session',
              employeeName: 'Owner',
              role: 'owner',
            }),
          },
        },
        {
          provide: AuthService,
          useValue: { getEmployeeProfile: async () => ({ id: employeeId, businessId }) },
        },
        { provide: LogAuditEventUseCase, useValue: { execute: async () => undefined } },
        ...[
          RegisterUseCase,
          UpdateProfileUseCase,
          ChangePinUseCase,
          GetActivityLogUseCase,
          BusinessTypeService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    }).compile();
    const app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    app.enableCors({ origin: corsOrigins(config.get('CORS_ORIGIN'), 'test'), credentials: true });
    await app.init();
    try {
      const http = request(app.getHttpServer());
      const login = await http
        .post('/api/v1/auth/login')
        .set('Origin', 'https://pos.example.com')
        .set('X-TiloPOS-Session', '1')
        .send({ email: 'owner@example.com', pin: '123456' })
        .expect(200);
      const cookie = login.headers['set-cookie'][0] as string;
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
      expect(login.headers['access-control-allow-credentials']).toBe('true');
      expect(login.headers['access-control-allow-origin']).toBe('https://pos.example.com');
      expect(login.body).not.toHaveProperty('refreshToken');
      await http
        .get('/api/v1/auth/me')
        .auth(login.body.accessToken, { type: 'bearer' })
        .expect(200);
      await http
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie.split(';')[0])
        .set('Origin', 'https://evil.example.com')
        .set('X-TiloPOS-Session', '1')
        .expect(403);
      const rotated = await http
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie.split(';')[0])
        .set('X-TiloPOS-Session', '1')
        .expect(200);
      expect(rotated.headers['set-cookie'][0]).not.toBe(cookie);
      await http
        .post('/api/v1/auth/logout')
        .set('Cookie', rotated.headers['set-cookie'][0].split(';')[0])
        .set('X-TiloPOS-Session', '1')
        .expect(200);
      await http
        .get('/api/v1/auth/me')
        .auth(rotated.body.accessToken, { type: 'bearer' })
        .expect(401);
    } finally {
      await app.close();
    }
  });
});
