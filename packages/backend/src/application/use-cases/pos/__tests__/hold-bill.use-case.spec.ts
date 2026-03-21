import { HoldBillUseCase, HoldBillInput } from '../hold-bill.use-case';
import { HeldBillStore } from '@infrastructure/cache/held-bill.store';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';

describe('HoldBillUseCase', () => {
  let useCase: HoldBillUseCase;
  let mockHeldBillStore: jest.Mocked<HeldBillStore>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  const baseInput: HoldBillInput = {
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    tableId: 'table-5',
    customerName: 'John Doe',
    items: [
      { productId: 'prod-1', quantity: 2, notes: 'Extra spicy' },
      { productId: 'prod-2', variantId: 'var-1', quantity: 1 },
    ],
    notes: 'VIP customer',
  };

  beforeEach(() => {
    mockHeldBillStore = {
      hold: jest.fn(),
      resume: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<HeldBillStore>;

    mockProductRepo = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'prod-1', name: 'Test Product', basePrice: 25000 }),
      findByBusinessId: jest.fn(),
      findByCategoryId: jest.fn(),
      findBySku: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    useCase = new HoldBillUseCase(mockHeldBillStore, mockProductRepo);
  });

  it('should hold a bill successfully and return a billId', async () => {
    mockHeldBillStore.hold.mockResolvedValue(undefined);

    const result = await useCase.execute(baseInput);

    expect(result.billId).toBeDefined();
    expect(typeof result.billId).toBe('string');
    expect(result.billId.length).toBeGreaterThan(0);
    expect(mockHeldBillStore.hold).toHaveBeenCalledTimes(1);
  });

  it('should pass correct data to the held bill store', async () => {
    mockHeldBillStore.hold.mockResolvedValue(undefined);

    await useCase.execute(baseInput);

    expect(mockHeldBillStore.hold).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        employeeId: 'emp-1',
        tableId: 'table-5',
        customerName: 'John Doe',
        notes: 'VIP customer',
        subtotal: expect.any(Number),
        heldAt: expect.any(String),
      }),
    );
    // Verify items include price snapshots
    const callArg = mockHeldBillStore.hold.mock.calls[0][0];
    expect(callArg.items).toHaveLength(2);
    expect(callArg.items[0]).toMatchObject({ productId: 'prod-1', quantity: 2, unitPrice: 25000 });
  });

  it('should generate a unique bill ID for each call', async () => {
    mockHeldBillStore.hold.mockResolvedValue(undefined);

    const result1 = await useCase.execute(baseInput);
    const result2 = await useCase.execute(baseInput);

    expect(result1.billId).not.toBe(result2.billId);
  });

  it('should hold a bill without optional fields', async () => {
    mockHeldBillStore.hold.mockResolvedValue(undefined);

    const minimalInput: HoldBillInput = {
      outletId: 'outlet-1',
      employeeId: 'emp-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
    };

    const result = await useCase.execute(minimalInput);

    expect(result.billId).toBeDefined();
    expect(mockHeldBillStore.hold).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        employeeId: 'emp-1',
        tableId: undefined,
        customerName: undefined,
        notes: undefined,
      }),
    );
  });

  it('should include a valid ISO timestamp in heldAt', async () => {
    mockHeldBillStore.hold.mockResolvedValue(undefined);

    await useCase.execute(baseInput);

    const callArg = mockHeldBillStore.hold.mock.calls[0][0];
    const parsedDate = new Date(callArg.heldAt);
    expect(parsedDate.getTime()).not.toBeNaN();
  });

  it('should propagate errors from the held bill store', async () => {
    mockHeldBillStore.hold.mockRejectedValue(new Error('Redis connection failed'));

    await expect(useCase.execute(baseInput)).rejects.toThrow('Redis connection failed');
  });
});
