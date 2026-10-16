import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RefreshSessionService } from '../refresh-session.service';

const businessId = '11111111-1111-4111-8111-111111111111';
const employeeId = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const raw = 'a'.repeat(43);
const employee = {
  id: employeeId,
  businessId,
  role: 'owner',
  isActive: true,
  outletId: null,
  name: 'Owner',
  emailVerified: true,
};

describe('RefreshSessionService', () => {
  let db: {
    authSession: { create: jest.Mock; findFirst: jest.Mock; updateMany: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
    employee: { findFirst: jest.Mock };
    outlet: { findFirst: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let service: RefreshSessionService;
  beforeEach(() => {
    db = {
      authSession: {
        create: jest.fn().mockImplementation(({ data }) => ({ ...data, id })),
        findFirst: jest.fn().mockResolvedValue({
          id,
          businessId,
          employeeId,
          outletId: null,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 86400000),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'token-id', sessionId: id, businessId, consumedAt: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      employee: { findFirst: jest.fn().mockResolvedValue(employee) },
      outlet: { findFirst: jest.fn() },
      $queryRaw: jest.fn(),
      $transaction: jest.fn().mockImplementation((fn) => fn(db)),
    };
    service = new RefreshSessionService(
      db as unknown as PrismaService,
      new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
      new ConfigService({ REFRESH_TOKEN_EXPIRES_IN: '7d' }),
    );
  });

  it('stores only a hash and binds the access token to the session', async () => {
    const result = await service.create({ employeeId, businessId, outletId: null });
    const data = db.refreshToken.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(createHash('sha256').update(result.refreshToken).digest('hex'));
    expect(JSON.stringify(data)).not.toContain(result.refreshToken);
    expect(new JwtService().decode(result.accessToken)).toMatchObject({
      sid: id,
      typ: 'access',
      sub: employeeId,
      businessId,
    });
  });

  it('consumes the old token and creates its successor inside one transaction', async () => {
    await service.rotate(raw);
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ consumedAt: null, businessId, sessionId: id }),
      }),
    );
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('commits revocation on reuse before rejecting (does not roll it back)', async () => {
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'token-id',
      sessionId: id,
      businessId,
      consumedAt: new Date(),
    });
    await expect(service.rotate(raw)).rejects.toThrow('Invalid refresh token');
    await expect(db.$transaction.mock.results[0].value).resolves.toBeNull();
    expect(db.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, businessId }, data: { revokedAt: expect.any(Date) } }),
    );
    expect(db.refreshToken.create).not.toHaveBeenCalled();
  });

  it.each(['revoked', 'expired', 'inactive'])('rejects %s sessions', async (condition) => {
    if (condition === 'inactive')
      db.employee.findFirst.mockResolvedValue({ ...employee, isActive: false });
    else
      db.authSession.findFirst.mockResolvedValue({
        id,
        businessId,
        employeeId,
        outletId: null,
        revokedAt: condition === 'revoked' ? new Date() : null,
        expiresAt: condition === 'expired' ? new Date(0) : new Date(Date.now() + 100000),
      });
    await expect(service.rotate(raw)).rejects.toThrow();
    expect(db.refreshToken.create).not.toHaveBeenCalled();
  });

  it('logout revokes the family even when given a consumed ancestor', async () => {
    await service.revoke(raw);
    expect(db.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, businessId } }),
    );
  });

  it('rejects access without a server session', async () => {
    await expect(
      service.assertActive({ sub: employeeId, businessId, outletId: null, role: 'owner' }),
    ).rejects.toThrow();
  });
});
