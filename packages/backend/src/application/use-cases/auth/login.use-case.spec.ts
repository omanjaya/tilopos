import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginUseCase, LoginInput } from './login.use-case';
import type { IEmployeeRepository, EmployeeRecord } from '@domain/interfaces/repositories/employee.repository';

jest.mock('bcrypt');

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;
  let mockJwtService: jest.Mocked<JwtService>;

  const activeEmployee: EmployeeRecord = {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseInput: LoginInput = {
    email: 'john@example.com',
    pin: '123456',
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

    mockJwtService = {
      sign: jest.fn().mockReturnValue('jwt-access-token'),
      signAsync: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    useCase = new LoginUseCase(mockEmployeeRepo, mockJwtService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should login successfully with valid credentials', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(activeEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute(baseInput);

    expect('accessToken' in result).toBe(true);
    if ('accessToken' in result) {
      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('John Doe');
      expect(result.role).toBe('cashier');
      expect(result.businessId).toBe('biz-1');
      expect(result.outletId).toBe('outlet-1');
    }
  });

  it('should throw UnauthorizedException when employee not found', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow('Invalid credentials');
  });

  it('should throw UnauthorizedException when employee is inactive', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue({
      ...activeEmployee,
      isActive: false,
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow('Invalid credentials');
  });

  it('should throw UnauthorizedException when PIN is not configured', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue({
      ...activeEmployee,
      pin: null,
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow('PIN not configured');
  });

  it('should throw UnauthorizedException when PIN is wrong', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(activeEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow('Invalid credentials');
  });

  it('should generate JWT token with correct payload', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(activeEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await useCase.execute(baseInput);

    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'emp-1',
      businessId: 'biz-1',
      outletId: 'outlet-1',
      role: 'cashier',
    });
  });

  it('should use input outletId if provided', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(activeEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const inputWithOutlet: LoginInput = {
      ...baseInput,
      outletId: 'outlet-2',
    };

    const result = await useCase.execute(inputWithOutlet);

    expect('outletId' in result).toBe(true);
    if ('outletId' in result) {
      expect(result.outletId).toBe('outlet-2');
    }
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-2',
      }),
    );
  });

  it('should fallback to employee outletId when input outletId not provided', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(activeEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute(baseInput);

    expect('outletId' in result).toBe(true);
    if ('outletId' in result) {
      expect(result.outletId).toBe('outlet-1');
    }
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
      }),
    );
  });

  it('should call bcrypt.compare with correct arguments', async () => {
    mockEmployeeRepo.findByEmail.mockResolvedValue(activeEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await useCase.execute(baseInput);

    expect(bcrypt.compare).toHaveBeenCalledWith('123456', '$2b$10$hashedpin123');
  });

  it('should return MFA pending result when employee has MFA enabled', async () => {
    const mfaEmployee: EmployeeRecord = {
      ...activeEmployee,
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    };

    mockEmployeeRepo.findByEmail.mockResolvedValue(mfaEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.sign.mockReturnValue('mfa-token-123');

    const result = await useCase.execute(baseInput);

    expect('requiresMfa' in result).toBe(true);
    if ('requiresMfa' in result) {
      expect(result.requiresMfa).toBe(true);
      expect(result.mfaToken).toBe('mfa-token-123');
    }
  });

  it('should sign MFA token with 5 minute expiry and correct payload', async () => {
    const mfaEmployee: EmployeeRecord = {
      ...activeEmployee,
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    };

    mockEmployeeRepo.findByEmail.mockResolvedValue(mfaEmployee);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await useCase.execute(baseInput);

    expect(mockJwtService.sign).toHaveBeenCalledWith(
      {
        sub: 'emp-1',
        purpose: 'mfa_verification',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        role: 'cashier',
      },
      { expiresIn: '5m' },
    );
  });
});
