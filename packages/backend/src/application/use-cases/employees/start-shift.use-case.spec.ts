import { StartShiftUseCase, StartShiftInput } from './start-shift.use-case';
import { BusinessError } from '@shared/errors/business-error';
import { AppError } from '@shared/errors/app-error';
import type {
  IShiftRepository,
  ShiftRecord,
} from '@domain/interfaces/repositories/shift.repository';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '@domain/interfaces/repositories/employee.repository';

describe('StartShiftUseCase', () => {
  let useCase: StartShiftUseCase;
  let mockShiftRepo: jest.Mocked<IShiftRepository>;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;

  const activeEmployee: EmployeeRecord = {
    id: 'emp-1',
    businessId: 'biz-1',
    outletId: 'outlet-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: null,
    pin: '$2b$10$hashedpin',
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

  const createdShift: ShiftRecord = {
    id: 'shift-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    startedAt: new Date('2025-01-01T08:00:00Z'),
    endedAt: null,
    openingCash: 500000,
    closingCash: null,
    expectedCash: null,
    cashDifference: null,
    cashIn: null,
    cashOut: null,
    notes: null,
    status: 'open',
    createdAt: new Date('2025-01-01T08:00:00Z'),
  };

  const baseInput: StartShiftInput = {
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    openingCash: 500000,
  };

  beforeEach(() => {
    mockShiftRepo = {
      findById: jest.fn(),
      findOpenShift: jest.fn(),
      create: jest.fn(),
      close: jest.fn(),
      addCashIn: jest.fn(),
      addCashOut: jest.fn(),
    };

    mockEmployeeRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      findByBusinessId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    useCase = new StartShiftUseCase(mockShiftRepo, mockEmployeeRepo);
  });

  it('should start shift successfully', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);
    mockShiftRepo.findOpenShift.mockResolvedValue(null);
    mockShiftRepo.create.mockResolvedValue(createdShift);

    const result = await useCase.execute(baseInput);

    expect(result.shiftId).toBe('shift-1');
    expect(result.startedAt).toEqual(createdShift.startedAt);
  });

  it('should throw AppError when employee not found', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(AppError);
    await expect(useCase.execute(baseInput)).rejects.toThrow(/not found or inactive/);
  });

  it('should throw AppError when employee is inactive', async () => {
    mockEmployeeRepo.findById.mockResolvedValue({
      ...activeEmployee,
      isActive: false,
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(AppError);
  });

  it('should throw BusinessError when employee already has an open shift', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);
    mockShiftRepo.findOpenShift.mockResolvedValue(createdShift);

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(baseInput)).rejects.toThrow(/already has an open shift/);
  });

  it('should create shift with correct data', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);
    mockShiftRepo.findOpenShift.mockResolvedValue(null);
    mockShiftRepo.create.mockResolvedValue(createdShift);

    await useCase.execute(baseInput);

    expect(mockShiftRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        employeeId: 'emp-1',
        openingCash: 500000,
        startedAt: expect.any(Date),
      }),
    );
  });

  it('should handle zero opening cash', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);
    mockShiftRepo.findOpenShift.mockResolvedValue(null);
    mockShiftRepo.create.mockResolvedValue({ ...createdShift, openingCash: 0 });

    const input: StartShiftInput = {
      ...baseInput,
      openingCash: 0,
    };

    const result = await useCase.execute(input);

    expect(result.shiftId).toBe('shift-1');
    expect(mockShiftRepo.create).toHaveBeenCalledWith(expect.objectContaining({ openingCash: 0 }));
  });
});
