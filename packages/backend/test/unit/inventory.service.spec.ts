import { BadRequestException } from '@nestjs/common';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
    valueOf: () => value,
    toString: () => String(value),
    [Symbol.toPrimitive]: () => value,
  });

  beforeEach(() => {
    mockPrisma = {
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      stockLevel: {
        findMany: jest.fn(),
      },
      stockMovement: {
        aggregate: jest.fn(),
        findFirst: jest.fn(),
      },
      stockTransfer: {
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    service = new InventoryService(mockPrisma);
  });

  // ==========================================================================
  // importProducts
  // ==========================================================================

  describe('importProducts', () => {
    it('should import valid products successfully', async () => {
      // Arrange
      const rows = [
        { name: 'Product A', basePrice: 10000, sku: 'SKU-A' },
        { name: 'Product B', basePrice: 20000, sku: 'SKU-B' },
      ];

      // No existing products with these SKUs
      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock transaction to execute the callback
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          product: {
            create: jest.fn().mockResolvedValue({ id: 'p-1' }),
          },
        };
        await callback(txMock);
      });

      // Act
      const result = await service.importProducts('biz-1', rows);

      // Assert
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should detect validation errors for missing name', async () => {
      // Arrange
      const rows = [
        { name: '', basePrice: 10000 },
        { name: 'Valid Product', basePrice: 20000 },
      ];

      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          product: {
            create: jest.fn().mockResolvedValue({ id: 'p-1' }),
          },
        };
        await callback(txMock);
      });

      // Act
      const result = await service.importProducts('biz-1', rows);

      // Assert
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toBe('Name is required');
    });

    it('should detect validation error for negative base price', async () => {
      // Arrange
      const rows = [{ name: 'Bad Product', basePrice: -5000 }];

      // Act
      const result = await service.importProducts('biz-1', rows);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('basePrice');
      expect(result.errors[0].message).toBe('Base price must be non-negative');
    });

    it('should detect validation error for missing base price', async () => {
      // Arrange
      const rows = [{ name: 'No Price', basePrice: NaN }];

      // Act
      const result = await service.importProducts('biz-1', rows);

      // Assert
      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('basePrice');
    });

    it('should detect duplicate SKU in database', async () => {
      // Arrange
      const rows = [{ name: 'Product', basePrice: 10000, sku: 'EXISTING-SKU' }];

      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-prod',
        sku: 'EXISTING-SKU',
      });

      // Act
      const result = await service.importProducts('biz-1', rows);

      // Assert
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('sku');
      expect(result.errors[0].message).toContain('already exists');
    });

    it('should detect negative cost price', async () => {
      // Arrange
      const rows = [{ name: 'Neg Cost', basePrice: 10000, costPrice: -1000 }];

      // Act
      const result = await service.importProducts('biz-1', rows);

      // Assert
      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('costPrice');
    });
  });

  // ==========================================================================
  // parseCsvToProductRows (CSV format)
  // ==========================================================================

  describe('parseCsvToProductRows', () => {
    it('should parse CSV data correctly', () => {
      // Arrange
      const csv = `name,sku,categoryId,basePrice,costPrice,description
Coffee,SKU-001,cat-1,25000,15000,Premium coffee
Tea,SKU-002,cat-1,15000,8000,Green tea`;

      // Act
      const result = service.parseCsvToProductRows(csv);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Coffee');
      expect(result[0].sku).toBe('SKU-001');
      expect(result[0].basePrice).toBe(25000);
      expect(result[0].costPrice).toBe(15000);
      expect(result[0].description).toBe('Premium coffee');
      expect(result[1].name).toBe('Tea');
    });

    it('should return empty array for CSV with only header', () => {
      // Arrange
      const csv = 'name,sku,categoryId,basePrice,costPrice,description';

      // Act
      const result = service.parseCsvToProductRows(csv);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      // Act
      const result = service.parseCsvToProductRows('');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // parseJsonToProductRows (JSON format)
  // ==========================================================================

  describe('parseJsonToProductRows', () => {
    it('should parse JSON data correctly', () => {
      // Arrange
      const json = JSON.stringify([
        { name: 'Coffee', sku: 'SKU-001', basePrice: 25000 },
        { name: 'Tea', basePrice: 15000 },
      ]);

      // Act
      const result = service.parseJsonToProductRows(json);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Coffee');
      expect(result[0].sku).toBe('SKU-001');
      expect(result[0].basePrice).toBe(25000);
      expect(result[1].name).toBe('Tea');
      expect(result[1].sku).toBeUndefined();
    });

    it('should throw BadRequestException when JSON is not an array', () => {
      // Arrange
      const json = JSON.stringify({ name: 'Not an array' });

      // Act & Assert
      expect(() => service.parseJsonToProductRows(json)).toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // exportProductsCsv
  // ==========================================================================

  describe('exportProductsCsv', () => {
    it('should export products as CSV string', async () => {
      // Arrange
      const products = [
        {
          name: 'Coffee',
          sku: 'SKU-001',
          basePrice: makeDecimal(25000),
          costPrice: makeDecimal(15000),
          description: 'Premium',
          isActive: true,
          category: { name: 'Beverages' },
        },
        {
          name: 'Tea',
          sku: 'SKU-002',
          basePrice: makeDecimal(15000),
          costPrice: null,
          description: null,
          isActive: true,
          category: null,
        },
      ];
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(products);

      // Act
      const result = await service.exportProductsCsv('biz-1');

      // Assert
      expect(result).toContain('name,sku,category,basePrice,costPrice,description,isActive');
      expect(result).toContain('Coffee');
      expect(result).toContain('SKU-001');
      expect(result).toContain('Beverages');
      expect(result).toContain('Tea');
      const lines = result.split('\n');
      expect(lines).toHaveLength(3); // header + 2 rows
    });
  });

  // ==========================================================================
  // getStockDiscrepancies (detectStockDiscrepancies)
  // ==========================================================================

  describe('getStockDiscrepancies', () => {
    it('should detect discrepancies between expected and actual stock', async () => {
      // Arrange
      const stockLevels = [
        {
          productId: 'prod-1',
          variantId: null,
          quantity: makeDecimal(50),
          product: { id: 'prod-1', name: 'Coffee Beans' },
        },
      ];
      (mockPrisma.stockLevel.findMany as jest.Mock).mockResolvedValue(stockLevels);

      // Expected from movements = 45 (differs from actual 50)
      (mockPrisma.stockMovement.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantity: makeDecimal(45) },
      });

      // Last adjustment
      (mockPrisma.stockMovement.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date('2026-01-20'),
      });

      // Act
      const result = await service.getStockDiscrepancies('outlet-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-1');
      expect(result[0].productName).toBe('Coffee Beans');
      expect(result[0].expectedQuantity).toBe(45);
      expect(result[0].actualQuantity).toBe(50);
      expect(result[0].discrepancy).toBe(5);
      expect(result[0].lastAdjusted).toEqual(new Date('2026-01-20'));
    });

    it('should return empty array when no discrepancies exist', async () => {
      // Arrange
      const stockLevels = [
        {
          productId: 'prod-1',
          variantId: null,
          quantity: makeDecimal(50),
          product: { id: 'prod-1', name: 'Coffee Beans' },
        },
      ];
      (mockPrisma.stockLevel.findMany as jest.Mock).mockResolvedValue(stockLevels);

      // Expected matches actual
      (mockPrisma.stockMovement.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantity: makeDecimal(50) },
      });

      // Act
      const result = await service.getStockDiscrepancies('outlet-1');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle stock levels with no product (skip them)', async () => {
      // Arrange
      const stockLevels = [
        {
          productId: null,
          variantId: null,
          quantity: makeDecimal(50),
          product: null,
        },
      ];
      (mockPrisma.stockLevel.findMany as jest.Mock).mockResolvedValue(stockLevels);

      // Act
      const result = await service.getStockDiscrepancies('outlet-1');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null last adjustment', async () => {
      // Arrange
      const stockLevels = [
        {
          productId: 'prod-1',
          variantId: null,
          quantity: makeDecimal(50),
          product: { id: 'prod-1', name: 'Coffee' },
        },
      ];
      (mockPrisma.stockLevel.findMany as jest.Mock).mockResolvedValue(stockLevels);

      (mockPrisma.stockMovement.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantity: makeDecimal(40) },
      });

      (mockPrisma.stockMovement.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.getStockDiscrepancies('outlet-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].lastAdjusted).toBeNull();
    });
  });
});
