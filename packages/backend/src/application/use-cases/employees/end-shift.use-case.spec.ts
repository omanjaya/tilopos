import { EndShiftUseCase, EndShiftInput } from './end-shift.use-case';
import { BusinessError } from '@shared/errors/business-error';
import type { IShiftRepository, ShiftRecord } from '@domain/interfaces/repositories/shift.repository';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('EndShiftUseCase', () => {
  let useCase: EndShiftUseCase;
  let mockShiftRepo: jest.Mocked<IShiftRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;

  const openShift: ShiftRecord = {
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

  const baseInput: EndShiftInput = {
    shiftId: 'shift-1',
    employeeId: 'emp-1',
    closingCash: 750000,
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

    mockPrisma = {
      payment: {
        aggregate: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new EndShiftUseCase(mockShiftRepo, mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should end shift successfully with correct cash count', async () => {
    mockShiftRepo.findById.mockResolvedValue(openShift);
    (mockPrisma.payment.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 300000 } } }) // cash sales
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 50000 } } }); // cash refunds
    mockShiftRepo.close.mockResolvedValue({
      ...openShift,
      status: 'closed',
      closingCash: 750000,
      endedAt: new Date(),
    });

    const result = await useCase.execute(baseInput);

    // expectedCash = openingCash(500000) + sales(300000) - refunds(50000) = 750000
    expect(result.shiftId).toBe('shift-1');
    expect(result.expectedCash).toBe(750000);
    expect(result.actualCash).toBe(750000);
    expect(result.difference).toBe(0); // 750000 - 750000 = 0
    expect(result.endedAt).toBeInstanceOf(Date);
    expect(mockShiftRepo.close).toHaveBeenCalledWith('shift-1', expect.objectContaining({
      closingCash: 750000,
      expectedCash: 750000,
      cashDifference: 0,
    }));
  });

  it('should calculate positive difference when actual cash exceeds expected', async () => {
    mockShiftRepo.findById.mockResolvedValue(openShift);
    (mockPrisma.payment.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 200000 } } }) // cash sales
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 0 } } }); // no refunds
    mockShiftRepo.close.mockResolvedValue({
      ...openShift,
      status: 'closed',
    });

    const input: EndShiftInput = {
      ...baseInput,
      closingCash: 750000, // more than expected 700000
    };

    const result = await useCase.execute(input);

    // expectedCash = 500000 + 200000 - 0 = 700000
    // difference = 750000 - 700000 = 50000
    expect(result.expectedCash).toBe(700000);
    expect(result.actualCash).toBe(750000);
    expect(result.difference).toBe(50000);
  });

  it('should calculate negative difference when actual cash is less than expected', async () => {
    mockShiftRepo.findById.mockResolvedValue(openShift);
    (mockPrisma.payment.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 200000 } } })
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 0 } } });
    mockShiftRepo.close.mockResolvedValue({
      ...openShift,
      status: 'closed',
    });

    const input: EndShiftInput = {
      ...baseInput,
      closingCash: 650000, // less than expected 700000
    };

    const result = await useCase.execute(input);

    expect(result.expectedCash).toBe(700000);
    expect(result.actualCash).toBe(650000);
    expect(result.difference).toBe(-50000);
  });

  it('should throw BusinessError when shift is not found', async () => {
    mockShiftRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(baseInput)).rejects.toThrow('Shift not found');
  });

  it('should throw BusinessError when shift is already closed', async () => {
    mockShiftRepo.findById.mockResolvedValue({
      ...openShift,
      status: 'closed',
      endedAt: new Date(),
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(baseInput)).rejects.toThrow('Shift is not open');
  });

  it('should throw BusinessError when employee does not own the shift', async () => {
    mockShiftRepo.findById.mockResolvedValue(openShift);

    const wrongEmployeeInput: EndShiftInput = {
      ...baseInput,
      employeeId: 'emp-other',
    };

    await expect(useCase.execute(wrongEmployeeInput)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(wrongEmployeeInput)).rejects.toThrow(
      'This shift does not belong to the employee',
    );
  });

  it('should handle zero cash sales and refunds', async () => {
    mockShiftRepo.findById.mockResolvedValue(openShift);
    (mockPrisma.payment.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: null } }) // no cash sales
      .mockResolvedValueOnce({ _sum: { amount: null } }); // no cash refunds
    mockShiftRepo.close.mockResolvedValue({
      ...openShift,
      status: 'closed',
    });

    const input: EndShiftInput = {
      ...baseInput,
      closingCash: 500000, // exactly opening cash
    };

    const result = await useCase.execute(input);

    // expectedCash = 500000 + 0 - 0 = 500000
    expect(result.expectedCash).toBe(500000);
    expect(result.difference).toBe(0);
  });

  it('should call shiftRepo.close with correct endedAt', async () => {
    mockShiftRepo.findById.mockResolvedValue(openShift);
    (mockPrisma.payment.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 0 } } })
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 0 } } });
    mockShiftRepo.close.mockResolvedValue({
      ...openShift,
      status: 'closed',
    });

    const result = await useCase.execute(baseInput);

    expect(mockShiftRepo.close).toHaveBeenCalledWith(
      'shift-1',
      expect.objectContaining({
        endedAt: expect.any(Date),
      }),
    );
    expect(result.endedAt).toBeInstanceOf(Date);
  });
});
