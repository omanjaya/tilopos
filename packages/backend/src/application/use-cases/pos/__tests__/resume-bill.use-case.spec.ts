import { NotFoundException } from '@nestjs/common';
import { ResumeBillUseCase, ResumeBillInput } from '../resume-bill.use-case';
import { HeldBillStore, HeldBillData } from '@infrastructure/cache/held-bill.store';

describe('ResumeBillUseCase', () => {
  let useCase: ResumeBillUseCase;
  let mockHeldBillStore: jest.Mocked<HeldBillStore>;

  const baseInput: ResumeBillInput = {
    outletId: 'outlet-1',
    billId: 'bill-123',
  };

  const heldBillData: HeldBillData = {
    id: 'bill-123',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    tableId: 'table-5',
    customerName: 'John Doe',
    items: [
      { productId: 'prod-1', quantity: 2, notes: 'Extra spicy' },
      { productId: 'prod-2', variantId: 'var-1', quantity: 1 },
    ],
    notes: 'VIP customer',
    heldAt: '2025-06-15T10:30:00.000Z',
  };

  beforeEach(() => {
    mockHeldBillStore = {
      hold: jest.fn(),
      resume: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<HeldBillStore>;

    useCase = new ResumeBillUseCase(mockHeldBillStore);
  });

  it('should resume a held bill successfully', async () => {
    mockHeldBillStore.resume.mockResolvedValue(heldBillData);

    const result = await useCase.execute(baseInput);

    expect(mockHeldBillStore.resume).toHaveBeenCalledWith('outlet-1', 'bill-123');
    expect(result).toEqual(heldBillData);
    expect(result.id).toBe('bill-123');
    expect(result.items).toHaveLength(2);
  });

  it('should throw NotFoundException when bill is not found', async () => {
    mockHeldBillStore.resume.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
    await expect(useCase.execute(baseInput)).rejects.toThrow(
      'Held bill not found or already resumed',
    );
  });

  it('should return the complete held bill data with all fields', async () => {
    mockHeldBillStore.resume.mockResolvedValue(heldBillData);

    const result = await useCase.execute(baseInput);

    expect(result.outletId).toBe('outlet-1');
    expect(result.employeeId).toBe('emp-1');
    expect(result.tableId).toBe('table-5');
    expect(result.customerName).toBe('John Doe');
    expect(result.notes).toBe('VIP customer');
    expect(result.heldAt).toBe('2025-06-15T10:30:00.000Z');
  });

  it('should pass the correct outletId and billId to the store', async () => {
    mockHeldBillStore.resume.mockResolvedValue(heldBillData);

    await useCase.execute({
      outletId: 'outlet-99',
      billId: 'bill-abc',
    });

    expect(mockHeldBillStore.resume).toHaveBeenCalledWith('outlet-99', 'bill-abc');
  });

  it('should propagate errors from the held bill store', async () => {
    mockHeldBillStore.resume.mockRejectedValue(new Error('Redis connection failed'));

    await expect(useCase.execute(baseInput)).rejects.toThrow('Redis connection failed');
  });
});
