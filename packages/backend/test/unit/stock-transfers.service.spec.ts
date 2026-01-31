import { StockTransfersService } from '../../src/modules/stock-transfers/stock-transfers.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('StockTransfersService', () => {
  let service: StockTransfersService;
  let mockPrisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockPrisma = {
      stockTransfer: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      stockLevel: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    service = new StockTransfersService(mockPrisma);
  });

  // ==========================================================================
  // getDiscrepancies (detectDiscrepancies)
  // ==========================================================================

  describe('getDiscrepancies', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should detect discrepancies when sent and received quantities differ', async () => {
      // Arrange
      const transfers = [
        {
          id: 'trf-1',
          transferNumber: 'TRF-001',
          status: 'received',
          shippedAt: new Date('2026-01-10'),
          receivedAt: new Date('2026-01-12'),
          sourceOutlet: { name: 'Main Outlet' },
          destinationOutlet: { name: 'Branch 1' },
          items: [
            {
              itemName: 'Coffee Beans',
              quantitySent: 100,
              quantityReceived: 95,
            },
            {
              itemName: 'Sugar',
              quantitySent: 50,
              quantityReceived: 50, // no discrepancy
            },
            {
              itemName: 'Milk',
              quantitySent: 30,
              quantityReceived: 25,
            },
          ],
        },
      ];
      (mockPrisma.stockTransfer.findMany as jest.Mock).mockResolvedValue(transfers);

      // Act
      const result = await service.getDiscrepancies('biz-1', from, to);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].transferId).toBe('trf-1');
      expect(result[0].transferNumber).toBe('TRF-001');
      expect(result[0].sourceOutletName).toBe('Main Outlet');
      expect(result[0].destinationOutletName).toBe('Branch 1');
      expect(result[0].items).toHaveLength(2); // Coffee Beans and Milk have discrepancies
      expect(result[0].items[0].itemName).toBe('Coffee Beans');
      expect(result[0].items[0].quantitySent).toBe(100);
      expect(result[0].items[0].quantityReceived).toBe(95);
      expect(result[0].items[0].difference).toBe(-5);
      expect(result[0].items[1].itemName).toBe('Milk');
      expect(result[0].items[1].difference).toBe(-5);
      expect(result[0].percentDiscrepancy).toBeGreaterThan(0);
    });

    it('should return empty array when no discrepancies exist', async () => {
      // Arrange
      const transfers = [
        {
          id: 'trf-1',
          transferNumber: 'TRF-001',
          status: 'received',
          shippedAt: new Date('2026-01-10'),
          receivedAt: new Date('2026-01-12'),
          sourceOutlet: { name: 'Main Outlet' },
          destinationOutlet: { name: 'Branch 1' },
          items: [
            {
              itemName: 'Coffee Beans',
              quantitySent: 100,
              quantityReceived: 100,
            },
            {
              itemName: 'Sugar',
              quantitySent: 50,
              quantityReceived: 50,
            },
          ],
        },
      ];
      (mockPrisma.stockTransfer.findMany as jest.Mock).mockResolvedValue(transfers);

      // Act
      const result = await service.getDiscrepancies('biz-1', from, to);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when no transfers found', async () => {
      // Arrange
      (mockPrisma.stockTransfer.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getDiscrepancies('biz-1', from, to);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null quantityReceived as 0', async () => {
      // Arrange
      const transfers = [
        {
          id: 'trf-1',
          transferNumber: 'TRF-002',
          status: 'received',
          shippedAt: new Date('2026-01-10'),
          receivedAt: new Date('2026-01-12'),
          sourceOutlet: { name: 'Main Outlet' },
          destinationOutlet: { name: 'Branch 2' },
          items: [
            {
              itemName: 'Tea Leaves',
              quantitySent: 50,
              quantityReceived: null,
            },
          ],
        },
      ];
      (mockPrisma.stockTransfer.findMany as jest.Mock).mockResolvedValue(transfers);

      // Act
      const result = await service.getDiscrepancies('biz-1', from, to);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].items[0].quantityReceived).toBe(0);
      expect(result[0].items[0].difference).toBe(-50);
    });

    it('should calculate percent discrepancy correctly', async () => {
      // Arrange
      const transfers = [
        {
          id: 'trf-1',
          transferNumber: 'TRF-003',
          status: 'received',
          shippedAt: new Date('2026-01-10'),
          receivedAt: new Date('2026-01-12'),
          sourceOutlet: { name: 'A' },
          destinationOutlet: { name: 'B' },
          items: [
            {
              itemName: 'Item A',
              quantitySent: 100,
              quantityReceived: 90, // diff = 10
            },
          ],
        },
      ];
      (mockPrisma.stockTransfer.findMany as jest.Mock).mockResolvedValue(transfers);

      // Act
      const result = await service.getDiscrepancies('biz-1', from, to);

      // Assert
      // totalSent = 100, totalDifference = 10, percent = (10/100)*100 = 10%
      expect(result[0].percentDiscrepancy).toBe(10);
    });
  });

  // ==========================================================================
  // autoCreateTransferRequest (createAutoTransfer)
  // ==========================================================================

  describe('autoCreateTransferRequest', () => {
    it('should create a transfer when destination has low stock and source has available stock', async () => {
      // Arrange
      const lowStockItems = [
        {
          product_id: 'prod-1',
          product_name: 'Coffee Beans',
          current_stock: 5,
          minimum_stock: 20,
        },
      ];
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(lowStockItems);

      // Source outlet has enough stock
      (mockPrisma.stockLevel.findFirst as jest.Mock).mockResolvedValue({
        productId: 'prod-1',
        quantity: 100,
        lowStockAlert: 20,
      });

      const createdTransfer = {
        id: 'trf-auto-1',
        transferNumber: 'TRF-AUTO-TEST',
      };
      (mockPrisma.stockTransfer.create as jest.Mock).mockResolvedValue(createdTransfer);

      // Act
      const result = await service.autoCreateTransferRequest(
        'biz-1',
        'dest-outlet',
        'source-outlet',
        'emp-1',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.transferId).toBe('trf-auto-1');
      expect(result!.itemCount).toBe(1);
      expect(mockPrisma.stockTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: 'biz-1',
          sourceOutletId: 'source-outlet',
          destinationOutletId: 'dest-outlet',
          status: 'pending',
          requestedBy: 'emp-1',
          notes: 'Auto-generated transfer request for low stock items',
        }),
      });
    });

    it('should return null when source has insufficient stock to transfer', async () => {
      // Arrange
      const lowStockItems = [
        {
          product_id: 'prod-1',
          product_name: 'Coffee Beans',
          current_stock: 5,
          minimum_stock: 20,
        },
      ];
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(lowStockItems);

      // Source outlet also has low stock (quantity <= lowStockAlert)
      (mockPrisma.stockLevel.findFirst as jest.Mock).mockResolvedValue({
        productId: 'prod-1',
        quantity: 15,
        lowStockAlert: 20,
      });

      // Act
      const result = await service.autoCreateTransferRequest(
        'biz-1',
        'dest-outlet',
        'source-outlet',
        'emp-1',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockPrisma.stockTransfer.create).not.toHaveBeenCalled();
    });

    it('should return null when no low stock items at destination', async () => {
      // Arrange
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.autoCreateTransferRequest(
        'biz-1',
        'dest-outlet',
        'source-outlet',
        'emp-1',
      );

      // Assert
      expect(result).toBeNull();
      expect(mockPrisma.stockTransfer.create).not.toHaveBeenCalled();
    });

    it('should return null when source does not have the product at all', async () => {
      // Arrange
      const lowStockItems = [
        {
          product_id: 'prod-1',
          product_name: 'Coffee Beans',
          current_stock: 5,
          minimum_stock: 20,
        },
      ];
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(lowStockItems);

      // No stock record at source
      (mockPrisma.stockLevel.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.autoCreateTransferRequest(
        'biz-1',
        'dest-outlet',
        'source-outlet',
        'emp-1',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should calculate correct transfer quantity as min of needed and available', async () => {
      // Arrange
      const lowStockItems = [
        {
          product_id: 'prod-1',
          product_name: 'Coffee Beans',
          current_stock: 5,
          minimum_stock: 20,
        },
      ];
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(lowStockItems);

      // Source has more than enough: available = 200 - 20 = 180
      // needed = 20 * 2 - 5 = 35
      // quantityToTransfer = min(35, 180) = 35
      (mockPrisma.stockLevel.findFirst as jest.Mock).mockResolvedValue({
        productId: 'prod-1',
        quantity: 200,
        lowStockAlert: 20,
      });

      (mockPrisma.stockTransfer.create as jest.Mock).mockResolvedValue({
        id: 'trf-1',
        transferNumber: 'TRF-AUTO-X',
      });

      // Act
      const result = await service.autoCreateTransferRequest(
        'biz-1',
        'dest-outlet',
        'source-outlet',
        'emp-1',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrisma.stockTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                productId: 'prod-1',
                itemName: 'Coffee Beans',
                quantitySent: 35,
              }),
            ],
          },
        }),
      });
    });
  });
});
