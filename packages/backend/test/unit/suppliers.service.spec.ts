import { SuppliersService } from '../../src/modules/suppliers/suppliers.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const now = new Date('2026-01-31T10:00:00.000Z');

  beforeEach(() => {
    mockPrisma = {
      supplier: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      purchaseOrder: {
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      purchaseOrderItem: {
        findFirst: jest.fn(),
      },
      $queryRaw: jest.fn(),
      stockLevel: {
        findFirst: jest.fn(),
      },
      outlet: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new SuppliersService(mockPrisma);
  });

  // ==========================================================================
  // getSupplierAnalytics
  // ==========================================================================

  describe('getSupplierAnalytics', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should return analytics with data for suppliers', async () => {
      // Arrange
      const orderedAt = new Date('2026-01-05');
      const receivedAt = new Date('2026-01-10');

      const suppliers = [
        {
          id: 'sup-1',
          name: 'Supplier One',
          purchaseOrders: [
            {
              id: 'po-1',
              status: 'received',
              totalAmount: 500000,
              createdAt: new Date('2026-01-05'),
              orderedAt,
              receivedAt,
              items: [
                { quantityOrdered: 100, quantityReceived: 100 },
              ],
            },
            {
              id: 'po-2',
              status: 'received',
              totalAmount: 300000,
              createdAt: new Date('2026-01-15'),
              orderedAt: new Date('2026-01-12'),
              receivedAt: new Date('2026-01-15'),
              items: [
                { quantityOrdered: 50, quantityReceived: 45 },
              ],
            },
          ],
        },
      ];
      (mockPrisma.supplier.findMany as jest.Mock).mockResolvedValue(suppliers);

      // Act
      const result = await service.getSupplierAnalytics('biz-1', from, to);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].supplierId).toBe('sup-1');
      expect(result[0].supplierName).toBe('Supplier One');
      expect(result[0].totalOrders).toBe(2);
      expect(result[0].totalAmount).toBe(800000);
      expect(result[0].averageLeadTimeDays).toBeGreaterThan(0);
      // Only the first PO is fully received (100 >= 100), second is not (45 < 50)
      expect(result[0].fulfillmentRate).toBe(50); // 1 out of 2 fully received
      expect(result[0].qualityIssues).toBe(1); // second PO has discrepancy
      expect(result[0].lastOrderDate).toEqual(new Date('2026-01-15'));
    });

    it('should return empty array when no suppliers exist', async () => {
      // Arrange
      (mockPrisma.supplier.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getSupplierAnalytics('biz-1', from, to);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle supplier with no orders', async () => {
      // Arrange
      const suppliers = [
        {
          id: 'sup-1',
          name: 'Empty Supplier',
          purchaseOrders: [],
        },
      ];
      (mockPrisma.supplier.findMany as jest.Mock).mockResolvedValue(suppliers);

      // Act
      const result = await service.getSupplierAnalytics('biz-1', from, to);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalOrders).toBe(0);
      expect(result[0].totalAmount).toBe(0);
      expect(result[0].averageLeadTimeDays).toBe(0);
      expect(result[0].fulfillmentRate).toBe(0);
      expect(result[0].qualityIssues).toBe(0);
      expect(result[0].lastOrderDate).toBeNull();
    });
  });

  // ==========================================================================
  // autoReorder (checkAutoReorder concept)
  // ==========================================================================

  describe('autoReorder', () => {
    it('should create purchase orders when low stock items have preferred suppliers', async () => {
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

      // Mock findPreferredSupplier
      (mockPrisma.purchaseOrderItem.findFirst as jest.Mock).mockResolvedValue({
        purchaseOrder: { supplierId: 'sup-1' },
      });

      // Mock supplier lookup
      (mockPrisma.supplier.findUnique as jest.Mock).mockResolvedValue({
        id: 'sup-1',
        name: 'Main Supplier',
      });

      // Mock PO creation
      (mockPrisma.purchaseOrder.create as jest.Mock).mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-AUTO-TEST',
      });

      // Act
      const result = await service.autoReorder('outlet-1', 'emp-1');

      // Assert
      expect(result.purchaseOrders).toHaveLength(1);
      expect(result.purchaseOrders[0].supplierId).toBe('sup-1');
      expect(result.purchaseOrders[0].supplierName).toBe('Main Supplier');
      expect(result.purchaseOrders[0].itemCount).toBe(1);
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalled();
    });

    it('should return empty purchase orders when no low stock items', async () => {
      // Arrange
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.autoReorder('outlet-1', 'emp-1');

      // Assert
      expect(result.purchaseOrders).toEqual([]);
      expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // approvePurchaseOrder
  // ==========================================================================

  describe('approvePurchaseOrder', () => {
    it('should approve a purchase order and set status to ordered', async () => {
      // Arrange
      const updatedPO = {
        id: 'po-1',
        poNumber: 'PO-001',
        status: 'ordered',
        supplierId: 'sup-1',
        totalAmount: 500000,
        orderedAt: now,
        supplier: { name: 'Supplier One' },
        items: [],
      };
      (mockPrisma.purchaseOrder.update as jest.Mock).mockResolvedValue(updatedPO);

      // Act
      const result = await service.approvePurchaseOrder('po-1', 'mgr-1', 'Approved');

      // Assert
      expect(result.id).toBe('po-1');
      expect(result.status).toBe('ordered');
      expect(result.approvedBy).toBe('mgr-1');
      expect(result.totalAmount).toBe(500000);
      expect(result.supplierName).toBe('Supplier One');
      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: {
          status: 'ordered',
          orderedAt: expect.any(Date),
          notes: 'Approved',
        },
        include: { supplier: true, items: true },
      });
    });

    it('should approve without notes when notes are not provided', async () => {
      // Arrange
      const updatedPO = {
        id: 'po-2',
        poNumber: 'PO-002',
        status: 'ordered',
        supplierId: 'sup-1',
        totalAmount: 200000,
        orderedAt: now,
        supplier: { name: 'Supplier Two' },
        items: [],
      };
      (mockPrisma.purchaseOrder.update as jest.Mock).mockResolvedValue(updatedPO);

      // Act
      const result = await service.approvePurchaseOrder('po-2', 'mgr-1');

      // Assert
      expect(result.status).toBe('ordered');
      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-2' },
        data: {
          status: 'ordered',
          orderedAt: expect.any(Date),
          notes: undefined,
        },
        include: { supplier: true, items: true },
      });
    });
  });

  // ==========================================================================
  // rejectPurchaseOrder
  // ==========================================================================

  describe('rejectPurchaseOrder', () => {
    it('should reject a purchase order and set status to cancelled', async () => {
      // Arrange
      const updatedPO = {
        id: 'po-1',
        poNumber: 'PO-001',
        status: 'cancelled',
        supplierId: 'sup-1',
        totalAmount: 500000,
        orderedAt: null,
        supplier: { name: 'Supplier One' },
        items: [],
      };
      (mockPrisma.purchaseOrder.update as jest.Mock).mockResolvedValue(updatedPO);

      // Act
      const result = await service.rejectPurchaseOrder(
        'po-1',
        'mgr-1',
        'Budget exceeded',
      );

      // Assert
      expect(result.id).toBe('po-1');
      expect(result.status).toBe('cancelled');
      expect(result.orderedAt).toBeNull();
      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: {
          status: 'cancelled',
          notes: 'Rejected by mgr-1: Budget exceeded',
        },
        include: { supplier: true, items: true },
      });
    });
  });
});
