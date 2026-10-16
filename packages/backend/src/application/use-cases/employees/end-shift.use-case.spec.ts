import { Prisma } from '@prisma/client';
import { EndShiftUseCase, EndShiftInput } from './end-shift.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { BusinessError } from '@shared/errors/business-error';
import type { PrismaService } from '@infrastructure/database/prisma.service';

const dec = (n: number) => new Prisma.Decimal(n);

describe('EndShiftUseCase', () => {
  let useCase: EndShiftUseCase;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBusService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tx: any;

  const openShift = {
    id: 'shift-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    startedAt: new Date('2025-01-01T08:00:00Z'),
    endedAt: null,
    openingCash: dec(500000),
    closingCash: null,
    expectedCash: null,
    cashDifference: null,
    cashIn: dec(0),
    cashOut: dec(0),
    notes: null,
    status: 'open',
  };

  const baseInput: EndShiftInput = {
    shiftId: 'shift-1',
    employeeId: 'emp-1',
    businessId: 'biz-1',
    closingCash: 750000,
  };

  const mockCash = (sales: number | null, refunds: number | null) => {
    tx.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: sales === null ? null : dec(sales) } })
      .mockResolvedValueOnce({ _sum: { amount: refunds === null ? null : dec(refunds) } });
  };

  beforeEach(() => {
    tx = {
      shift: {
        findFirst: jest.fn().mockResolvedValue(openShift),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: { aggregate: jest.fn() },
      transaction: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { grandTotal: dec(300000) }, _count: { id: 3 } }),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ name: 'John Doe' }),
      },
    };

    mockPrisma = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: jest.fn().mockImplementation(async (fn: (t: any) => unknown) => fn(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    useCase = new EndShiftUseCase(mockPrisma, mockEventBus);
  });

  it('ends the shift with Decimal totals and a conditional status update', async () => {
    mockCash(300000, 50000);

    const result = await useCase.execute(baseInput);

    // expected = 500000 + 300000 - 50000 = 750000
    expect(result).toEqual(
      expect.objectContaining({
        shiftId: 'shift-1',
        expectedCash: 750000,
        actualCash: 750000,
        difference: 0,
      }),
    );
    expect(tx.shift.findFirst).toHaveBeenCalledWith({
      where: { id: 'shift-1', outlet: { businessId: 'biz-1' } },
    });
    const call = tx.shift.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'shift-1', status: 'open' });
    expect(call.data.status).toBe('closed');
    expect(call.data.expectedCash.toNumber()).toBe(750000);
    expect(call.data.cashDifference.toNumber()).toBe(0);
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('includes petty cash in/out and refunds stored as negatives', async () => {
    tx.shift.findFirst.mockResolvedValue({ ...openShift, cashIn: dec(20000), cashOut: dec(5000) });
    mockCash(200000, -10000);

    const result = await useCase.execute({ ...baseInput, closingCash: 700000 });

    // 500000 + 200000 - 10000 + 20000 - 5000 = 705000
    expect(result.expectedCash).toBe(705000);
    expect(result.difference).toBe(-5000);
  });

  it('handles fractional amounts without float drift', async () => {
    tx.shift.findFirst.mockResolvedValue({ ...openShift, openingCash: dec(0.1) });
    mockCash(0.2, null);

    const result = await useCase.execute({ ...baseInput, closingCash: 0.3 });

    expect(result.expectedCash).toBe(0.3);
    expect(result.difference).toBe(0);
  });

  it('throws when the shift is not in the caller business', async () => {
    tx.shift.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow('Shift not found');
    expect(tx.shift.updateMany).not.toHaveBeenCalled();
  });

  it('throws when the shift is already closed', async () => {
    tx.shift.findFirst.mockResolvedValue({ ...openShift, status: 'closed' });

    await expect(useCase.execute(baseInput)).rejects.toThrow('Shift is not open');
  });

  it('throws when the employee does not own the shift', async () => {
    await expect(useCase.execute({ ...baseInput, employeeId: 'emp-other' })).rejects.toThrow(
      'This shift does not belong to the employee',
    );
  });

  it('loses the race cleanly when a concurrent request closed the shift first', async () => {
    mockCash(0, 0);
    tx.shift.updateMany.mockResolvedValue({ count: 0 });

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
