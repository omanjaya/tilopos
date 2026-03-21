import { StartShiftUseCase, StartShiftInput } from './start-shift.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError } from '@shared/errors/business-error';
import { AppError } from '@shared/errors/app-error';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '@domain/interfaces/repositories/employee.repository';

describe('StartShiftUseCase', () => {
  let useCase: StartShiftUseCase;
  let mockEmployeeRepo: jest.Mocked<IEmployeeRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBusService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;

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
    emailVerified: false,
    onboardingCompleted: false,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdShift = {
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
    mockEmployeeRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      findByBusinessId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockTx = {
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdShift),
      },
    };

    mockPrisma = {
      $transaction: jest.fn().mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (fn: (tx: any) => Promise<unknown>) => fn(mockTx),
      ),
    } as unknown as jest.Mocked<PrismaService>;

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    useCase = new StartShiftUseCase(mockEmployeeRepo, mockPrisma, mockEventBus);
  });

  it('should start shift successfully', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);

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
    mockTx.shift.findFirst.mockResolvedValueOnce({ id: 'existing-shift' });

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
  });

  it('should create shift with correct data', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);

    await useCase.execute(baseInput);

    expect(mockTx.shift.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outletId: 'outlet-1',
          employeeId: 'emp-1',
          openingCash: 500000,
          startedAt: expect.any(Date),
          status: 'open',
        }),
      }),
    );
  });

  it('should handle zero opening cash', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);
    mockTx.shift.create.mockResolvedValue({ ...createdShift, openingCash: 0 });

    const input: StartShiftInput = {
      ...baseInput,
      openingCash: 0,
    };

    const result = await useCase.execute(input);

    expect(result.shiftId).toBe('shift-1');
    expect(mockTx.shift.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ openingCash: 0 }),
      }),
    );
  });

  it('should throw BusinessError when another employee has open shift at outlet', async () => {
    mockEmployeeRepo.findById.mockResolvedValue(activeEmployee);

    // Re-create mockPrisma with findFirst returning null first (employee check), then existing (outlet check)
    const localTx = {
      shift: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'other-shift', employeeId: 'other-emp' }),
        create: jest.fn(),
      },
    };
    mockPrisma.$transaction = jest.fn().mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => fn(localTx),
    ) as jest.Mock;

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
  });
});
