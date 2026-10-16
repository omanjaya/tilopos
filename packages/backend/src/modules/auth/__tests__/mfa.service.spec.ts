import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MfaService } from '../mfa/mfa.service';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '@domain/interfaces/repositories/employee.repository';
import * as totpUtil from '../mfa/totp.util';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { MfaSecretCipher } from '../mfa/mfa-secret.cipher';
import type { LoginAttemptService } from '@infrastructure/security/login-attempt.service';

jest.mock('bcrypt');

describe('MfaService', () => {
  let service: MfaService;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;
  let attempts: jest.Mocked<
    Pick<LoginAttemptService, 'assertNotLocked' | 'recordFailure' | 'reset'>
  >;
  const cipher = new MfaSecretCipher({
    get: () => undefined,
    getOrThrow: () => 'x'.repeat(40),
  } as unknown as ConfigService);

  const baseEmployee: EmployeeRecord = {
    id: 'emp-1',
    businessId: 'biz-1',
    outletId: 'outlet-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '081234567890',
    pin: '$2b$10$hashedpin123',
    role: 'cashier',
    permissions: {},
    hourlyRate: 30000,
    isActive: true,
    mfaSecret: null,
    mfaEnabled: false,
    googleId: null,
    authProvider: 'local',
    profilePhotoUrl: null,
    preferences: null,
    emailVerified: false,
    onboardingCompleted: false,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockEmployeeRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      findByBusinessId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    attempts = {
      assertNotLocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    service = new MfaService(mockEmployeeRepo, cipher, attempts as unknown as LoginAttemptService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate a TOTP secret and otpauth URL', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(baseEmployee);
      mockEmployeeRepo.update.mockResolvedValue({
        ...baseEmployee,
        mfaSecret: 'GENERATED_SECRET',
      });

      const result = await service.generateSecret('emp-1');

      expect(result.secret).toBeDefined();
      expect(typeof result.secret).toBe('string');
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain('TILO');
      expect(result.otpauthUrl).toContain('john%40example.com');
    });

    it('should store the generated secret on the employee record', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(baseEmployee);
      mockEmployeeRepo.update.mockResolvedValue({
        ...baseEmployee,
        mfaSecret: 'GENERATED_SECRET',
      });

      const result = await service.generateSecret('emp-1');

      const stored = (mockEmployeeRepo.update.mock.calls[0][1] as { mfaSecret: string }).mfaSecret;
      // Encrypted at rest, never the plaintext seed shown to the user
      expect(stored.startsWith('enc:v1:')).toBe(true);
      expect(stored).not.toContain(result.secret);
      expect(cipher.decrypt(stored)).toBe(result.secret);
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);

      await expect(service.generateSecret('emp-999')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if MFA is already enabled', async () => {
      mockEmployeeRepo.findById.mockResolvedValue({
        ...baseEmployee,
        mfaEnabled: true,
        mfaSecret: 'EXISTING_SECRET',
      });

      await expect(service.generateSecret('emp-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('enableMfa', () => {
    it('should enable MFA when valid token is provided', async () => {
      const secret = totpUtil.generateBase32Secret();
      const employee: EmployeeRecord = {
        ...baseEmployee,
        mfaSecret: secret,
        mfaEnabled: false,
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockEmployeeRepo.update.mockResolvedValue({
        ...employee,
        mfaEnabled: true,
      });

      const token = totpUtil.generateTotp(secret);
      const result = await service.enableMfa('emp-1', token);

      expect(result.enabled).toBe(true);
      expect(mockEmployeeRepo.update).toHaveBeenCalledWith('emp-1', {
        mfaEnabled: true,
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const secret = totpUtil.generateBase32Secret();
      const employee: EmployeeRecord = {
        ...baseEmployee,
        mfaSecret: secret,
        mfaEnabled: false,
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);

      await expect(service.enableMfa('emp-1', '000000')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if MFA is already enabled', async () => {
      mockEmployeeRepo.findById.mockResolvedValue({
        ...baseEmployee,
        mfaEnabled: true,
        mfaSecret: 'EXISTING_SECRET',
      });

      await expect(service.enableMfa('emp-1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if secret not generated', async () => {
      mockEmployeeRepo.findById.mockResolvedValue({
        ...baseEmployee,
        mfaSecret: null,
        mfaEnabled: false,
      });

      await expect(service.enableMfa('emp-1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA when valid token is provided', async () => {
      const secret = totpUtil.generateBase32Secret();
      const employee: EmployeeRecord = {
        ...baseEmployee,
        mfaSecret: secret,
        mfaEnabled: true,
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockEmployeeRepo.update.mockResolvedValue({
        ...employee,
        mfaEnabled: false,
        mfaSecret: null,
      });

      const token = totpUtil.generateTotp(secret);
      const result = await service.disableMfa('emp-1', token, '123456');

      expect(result.disabled).toBe(true);
      expect(mockEmployeeRepo.update).toHaveBeenCalledWith('emp-1', {
        mfaEnabled: false,
        mfaSecret: null,
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const secret = totpUtil.generateBase32Secret();
      const employee: EmployeeRecord = {
        ...baseEmployee,
        mfaSecret: secret,
        mfaEnabled: true,
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);

      await expect(service.disableMfa('emp-1', '000000', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(attempts.recordFailure).toHaveBeenCalledWith('mfa', 'emp-1');
    });

    it('should require the PIN (re-authentication) to disable MFA', async () => {
      const secret = totpUtil.generateBase32Secret();
      mockEmployeeRepo.findById.mockResolvedValue({
        ...baseEmployee,
        mfaSecret: cipher.encrypt(secret),
        mfaEnabled: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.disableMfa('emp-1', totpUtil.generateTotp(secret), '999999'),
      ).rejects.toThrow('Invalid PIN');
      expect(mockEmployeeRepo.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if MFA is not enabled', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(baseEmployee);

      await expect(service.disableMfa('emp-1', '123456', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);

      await expect(service.disableMfa('emp-999', '123456', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('encrypted secrets', () => {
    it('enables MFA with an encrypted stored seed', async () => {
      const secret = totpUtil.generateBase32Secret();
      mockEmployeeRepo.findById.mockResolvedValue({
        ...baseEmployee,
        mfaSecret: cipher.encrypt(secret),
      });
      mockEmployeeRepo.update.mockResolvedValue(baseEmployee);

      await expect(service.enableMfa('emp-1', totpUtil.generateTotp(secret))).resolves.toEqual({
        enabled: true,
      });
    });

    it('respects the per-account lockout', async () => {
      mockEmployeeRepo.findById.mockResolvedValue({ ...baseEmployee, mfaSecret: 'X' });
      attempts.assertNotLocked.mockRejectedValue(new Error('locked'));

      await expect(service.enableMfa('emp-1', '123456')).rejects.toThrow('locked');
    });
  });
});
