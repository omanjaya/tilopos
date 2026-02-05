import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MfaService } from '../mfa/mfa.service';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '@domain/interfaces/repositories/employee.repository';
import * as totpUtil from '../mfa/totp.util';

describe('MfaService', () => {
  let service: MfaService;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;

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

    service = new MfaService(mockEmployeeRepo);
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

      await service.generateSecret('emp-1');

      expect(mockEmployeeRepo.update).toHaveBeenCalledWith(
        'emp-1',
        expect.objectContaining({
          mfaSecret: expect.any(String),
        }),
      );
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

  describe('verifyToken', () => {
    it('should return true for a valid TOTP token', async () => {
      const secret = totpUtil.generateBase32Secret();
      const employee: EmployeeRecord = {
        ...baseEmployee,
        mfaSecret: secret,
        mfaEnabled: true,
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);

      const token = totpUtil.generateTotp(secret);
      const result = await service.verifyToken('emp-1', token);

      expect(result).toBe(true);
    });

    it('should return false for an invalid TOTP token', async () => {
      const secret = totpUtil.generateBase32Secret();
      const employee: EmployeeRecord = {
        ...baseEmployee,
        mfaSecret: secret,
        mfaEnabled: true,
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);

      const result = await service.verifyToken('emp-1', '000000');

      expect(result).toBe(false);
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);

      await expect(service.verifyToken('emp-999', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if MFA secret not configured', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(baseEmployee);

      await expect(service.verifyToken('emp-1', '123456')).rejects.toThrow(BadRequestException);
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
      const result = await service.disableMfa('emp-1', token);

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

      await expect(service.disableMfa('emp-1', '000000')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if MFA is not enabled', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(baseEmployee);

      await expect(service.disableMfa('emp-1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepo.findById.mockResolvedValue(null);

      await expect(service.disableMfa('emp-999', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });
});
