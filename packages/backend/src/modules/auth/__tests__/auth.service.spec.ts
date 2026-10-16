import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { MfaSecretCipher } from '../mfa/mfa-secret.cipher';
import * as totpUtil from '../mfa/totp.util';
import type {
  EmployeeRecord,
  IEmployeeRepository,
} from '@domain/interfaces/repositories/employee.repository';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { EmailService } from '@infrastructure/notifications/email/email.service';
import type { PurposeTokenService } from '@infrastructure/auth/purpose-token.service';
import type { LoginAttemptService } from '@infrastructure/security/login-attempt.service';

const employee: EmployeeRecord = {
  id: 'emp-1',
  businessId: 'biz-1',
  outletId: 'outlet-1',
  name: 'Owner',
  email: 'owner@example.com',
  phone: null,
  pin: 'hash',
  role: 'owner',
  permissions: {},
  hourlyRate: null,
  isActive: true,
  mfaSecret: null,
  mfaEnabled: false,
  googleId: null,
  authProvider: 'local',
  profilePhotoUrl: null,
  preferences: null,
  emailVerified: true,
  onboardingCompleted: true,
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const profile = {
  googleId: 'g-1',
  email: 'owner@example.com',
  emailVerified: true,
  name: 'Owner',
  picture: null,
};

describe('AuthService', () => {
  let repo: jest.Mocked<IEmployeeRepository>;
  let prisma: { employee: { findMany: jest.Mock } };
  let attempts: {
    assertNotLocked: jest.Mock;
    recordFailure: jest.Mock;
    reset: jest.Mock;
    markCodeUsed: jest.Mock;
  };
  let purposeTokens: { verify: jest.Mock; sign: jest.Mock };
  let service: AuthService;
  const config = {
    get: (k: string) => (k === 'GOOGLE_CLIENT_ID' ? 'client' : undefined),
    getOrThrow: () => 's'.repeat(40),
  } as unknown as ConfigService;
  const cipher = new MfaSecretCipher(config);

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByBusinessId: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockImplementation(async (id, data) => ({ ...employee, id, ...data })),
    };
    prisma = { employee: { findMany: jest.fn() } };
    attempts = {
      assertNotLocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
      markCodeUsed: jest.fn().mockResolvedValue(true),
    };
    purposeTokens = { verify: jest.fn(), sign: jest.fn() };
    service = new AuthService(
      repo,
      { sign: jest.fn().mockReturnValue('access') } as unknown as JwtService,
      config,
      prisma as unknown as PrismaService,
      {} as EmailService,
      purposeTokens as unknown as PurposeTokenService,
      attempts as unknown as LoginAttemptService,
      cipher,
    );
  });

  describe('validateOAuthUser', () => {
    it('refuses unverified Google e-mails', async () => {
      await expect(
        service.validateOAuthUser({ ...profile, emailVerified: false }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repo.findByGoogleId).not.toHaveBeenCalled();
    });

    it('refuses to pick a tenant when the e-mail matches several employees', async () => {
      prisma.employee.findMany.mockResolvedValue([
        { id: 'emp-1', googleId: null },
        { id: 'emp-x', googleId: null },
      ]);
      await expect(service.validateOAuthUser(profile)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('never re-links an account already linked to another Google identity', async () => {
      prisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', googleId: 'g-other' }]);
      await expect(service.validateOAuthUser(profile)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('links a single active, unlinked match (case-insensitive)', async () => {
      prisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', googleId: null }]);
      const result = await service.validateOAuthUser(profile);
      expect(result.googleId).toBe('g-1');
      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { equals: 'owner@example.com', mode: 'insensitive' }, isActive: true },
        }),
      );
    });
  });

  describe('verifyMfaAndLogin', () => {
    const secret = totpUtil.generateBase32Secret();
    const mfaEmployee = { ...employee, mfaEnabled: true, mfaSecret: cipher.encrypt(secret) };

    beforeEach(() => {
      purposeTokens.verify.mockReturnValue({ sub: 'emp-1', outletId: 'outlet-1' });
      repo.findById.mockResolvedValue(mfaEmployee);
    });

    it('logs in with a valid code and resets the failure counter', async () => {
      const result = await service.verifyMfaAndLogin('mfa', totpUtil.generateTotp(secret));
      expect(result.accessToken).toBe('access');
      expect(attempts.reset).toHaveBeenCalledWith('mfa', 'emp-1');
    });

    it('records failures per account for wrong codes', async () => {
      await expect(service.verifyMfaAndLogin('mfa', '000000')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(attempts.recordFailure).toHaveBeenCalledWith('mfa', 'emp-1');
    });

    it('rejects a replayed code', async () => {
      attempts.markCodeUsed.mockResolvedValue(false);
      await expect(service.verifyMfaAndLogin('mfa', totpUtil.generateTotp(secret))).rejects.toThrow(
        'already used',
      );
    });

    it('is blocked while the account is locked', async () => {
      attempts.assertNotLocked.mockRejectedValue(new Error('locked'));
      await expect(service.verifyMfaAndLogin('mfa', '123456')).rejects.toThrow('locked');
      expect(repo.findById).not.toHaveBeenCalled();
    });
  });
});
