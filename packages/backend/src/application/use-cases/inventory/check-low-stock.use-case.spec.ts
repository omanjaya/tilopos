import { CheckLowStockUseCase, CheckLowStockInput } from './check-low-stock.use-case';
import type { IInventoryRepository, StockLevelRecord } from '@domain/interfaces/repositories/inventory.repository';
import type { IProductRepository, ProductRecord } from '@domain/interfaces/repositories/product.repository';

describe('CheckLowStockUseCase', () => {
  let useCase: CheckLowStockUseCase;
  let mockInventoryRepo: jest.Mocked<IInventoryRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  const baseInput: CheckLowStockInput = {
    outletId: 'outlet-1',
    businessId: 'biz-1',
  };

  const makeStockLevel = (overrides: Partial<StockLevelRecord> = {}): StockLevelRecord => ({
    id: 'stock-1',
    outletId: 'outlet-1',
    productId: 'prod-1',
    variantId: null,
    quantity: 3,
    lowStockAlert: 5,
    updatedAt: new Date(),
    ...overrides,
  });

  const makeProduct = (overrides: Partial<ProductRecord> = {}): ProductRecord => ({
    id: 'prod-1',
    businessId: 'biz-1',
    categoryId: 'cat-1',
    sku: 'SKU-001',
    name: 'Nasi Goreng',
    description: null,
    imageUrl: null,
    basePrice: 25000,
    costPrice: 10000,
    hasVariants: false,
    trackStock: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockInventoryRepo = {
      findStockLevel: jest.fn(),
      findStockLevelsByOutlet: jest.fn(),
      findLowStockItems: jest.fn(),
      updateStockLevel: jest.fn(),
      createStockMovement: jest.fn(),
    };

    mockProductRepo = {
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findByCategoryId: jest.fn(),
      findBySku: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CheckLowStockUseCase(mockInventoryRepo, mockProductRepo);
  });

  it('should identify products below minimum threshold', async () => {
    const lowStockRecord = makeStockLevel({
      id: 'stock-1',
      productId: 'prod-1',
      quantity: 3,
      lowStockAlert: 5,
    });
    const product = makeProduct({ id: 'prod-1', name: 'Nasi Goreng' });

    mockInventoryRepo.findLowStockItems.mockResolvedValue([lowStockRecord]);
    mockProductRepo.findById.mockResolvedValue(product);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(1);
    expect(result.lowStockItems[0]).toEqual({
      productId: 'prod-1',
      productName: 'Nasi Goreng',
      currentQuantity: 3,
      lowStockAlert: 5,
    });
    expect(result.totalLowStockCount).toBe(1);
    expect(result.outletId).toBe('outlet-1');
  });

  it('should return empty when all stock is sufficient', async () => {
    mockInventoryRepo.findLowStockItems.mockResolvedValue([]);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(0);
    expect(result.totalLowStockCount).toBe(0);
  });

  it('should handle multiple low stock products', async () => {
    const lowStockRecords: StockLevelRecord[] = [
      makeStockLevel({ id: 'stock-1', productId: 'prod-1', quantity: 2, lowStockAlert: 10 }),
      makeStockLevel({ id: 'stock-2', productId: 'prod-2', quantity: 0, lowStockAlert: 5 }),
      makeStockLevel({ id: 'stock-3', productId: 'prod-3', quantity: 4, lowStockAlert: 8 }),
    ];

    const products: ProductRecord[] = [
      makeProduct({ id: 'prod-1', name: 'Nasi Goreng' }),
      makeProduct({ id: 'prod-2', name: 'Mie Goreng' }),
      makeProduct({ id: 'prod-3', name: 'Es Teh' }),
    ];

    mockInventoryRepo.findLowStockItems.mockResolvedValue(lowStockRecords);
    mockProductRepo.findById
      .mockResolvedValueOnce(products[0])
      .mockResolvedValueOnce(products[1])
      .mockResolvedValueOnce(products[2]);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(3);
    expect(result.totalLowStockCount).toBe(3);

    expect(result.lowStockItems[0].productName).toBe('Nasi Goreng');
    expect(result.lowStockItems[0].currentQuantity).toBe(2);

    expect(result.lowStockItems[1].productName).toBe('Mie Goreng');
    expect(result.lowStockItems[1].currentQuantity).toBe(0);

    expect(result.lowStockItems[2].productName).toBe('Es Teh');
    expect(result.lowStockItems[2].currentQuantity).toBe(4);
  });

  it('should skip stock records with null productId', async () => {
    const stockRecordWithNullProduct = makeStockLevel({
      id: 'stock-1',
      productId: null,
      quantity: 2,
      lowStockAlert: 5,
    });

    mockInventoryRepo.findLowStockItems.mockResolvedValue([stockRecordWithNullProduct]);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(0);
    expect(result.totalLowStockCount).toBe(0);
    expect(mockProductRepo.findById).not.toHaveBeenCalled();
  });

  it('should skip inactive products', async () => {
    const lowStockRecord = makeStockLevel({
      id: 'stock-1',
      productId: 'prod-1',
      quantity: 1,
      lowStockAlert: 5,
    });
    const inactiveProduct = makeProduct({ id: 'prod-1', isActive: false });

    mockInventoryRepo.findLowStockItems.mockResolvedValue([lowStockRecord]);
    mockProductRepo.findById.mockResolvedValue(inactiveProduct);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(0);
    expect(result.totalLowStockCount).toBe(0);
  });

  it('should skip products that are not found', async () => {
    const lowStockRecord = makeStockLevel({
      id: 'stock-1',
      productId: 'deleted-prod',
      quantity: 1,
      lowStockAlert: 5,
    });

    mockInventoryRepo.findLowStockItems.mockResolvedValue([lowStockRecord]);
    mockProductRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(0);
    expect(result.totalLowStockCount).toBe(0);
  });

  it('should call findLowStockItems with correct outletId', async () => {
    mockInventoryRepo.findLowStockItems.mockResolvedValue([]);

    await useCase.execute({ outletId: 'outlet-42', businessId: 'biz-1' });

    expect(mockInventoryRepo.findLowStockItems).toHaveBeenCalledWith('outlet-42');
  });

  it('should include products with zero stock', async () => {
    const zeroStockRecord = makeStockLevel({
      id: 'stock-1',
      productId: 'prod-1',
      quantity: 0,
      lowStockAlert: 10,
    });
    const product = makeProduct({ id: 'prod-1', name: 'Ayam Bakar' });

    mockInventoryRepo.findLowStockItems.mockResolvedValue([zeroStockRecord]);
    mockProductRepo.findById.mockResolvedValue(product);

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(1);
    expect(result.lowStockItems[0].currentQuantity).toBe(0);
    expect(result.lowStockItems[0].productName).toBe('Ayam Bakar');
  });

  it('should filter out inactive products from mixed results', async () => {
    const stockRecords: StockLevelRecord[] = [
      makeStockLevel({ id: 'stock-1', productId: 'prod-active', quantity: 2, lowStockAlert: 5 }),
      makeStockLevel({ id: 'stock-2', productId: 'prod-inactive', quantity: 1, lowStockAlert: 5 }),
      makeStockLevel({ id: 'stock-3', productId: 'prod-active-2', quantity: 0, lowStockAlert: 3 }),
    ];

    mockInventoryRepo.findLowStockItems.mockResolvedValue(stockRecords);
    mockProductRepo.findById
      .mockResolvedValueOnce(makeProduct({ id: 'prod-active', name: 'Nasi Goreng', isActive: true }))
      .mockResolvedValueOnce(makeProduct({ id: 'prod-inactive', name: 'Old Item', isActive: false }))
      .mockResolvedValueOnce(makeProduct({ id: 'prod-active-2', name: 'Es Jeruk', isActive: true }));

    const result = await useCase.execute(baseInput);

    expect(result.lowStockItems).toHaveLength(2);
    expect(result.totalLowStockCount).toBe(2);
    expect(result.lowStockItems.map(i => i.productName)).toEqual(['Nasi Goreng', 'Es Jeruk']);
  });
});
