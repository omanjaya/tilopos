import { NotFoundException } from '@nestjs/common';
import { TablesService } from '../tables.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('TablesService', () => {
  let service: TablesService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const now = new Date();

  const makeTable = (overrides: Record<string, unknown> = {}) => ({
    id: 'table-1',
    outletId: 'outlet-1',
    name: 'Table 1',
    capacity: 4,
    section: 'Main Hall',
    positionX: 10,
    positionY: 20,
    status: 'available',
    currentOrderId: null,
    occupiedAt: null,
    isActive: true,
    createdAt: now,
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = {
      table: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new TablesService(mockPrisma);
  });

  describe('findById', () => {
    it('should return a table when found', async () => {
      const prismaTable = makeTable();
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(prismaTable);

      const result = await service.findById('table-1');

      expect(mockPrisma.table.findUnique).toHaveBeenCalledWith({
        where: { id: 'table-1' },
      });
      expect(result.id).toBe('table-1');
      expect(result.name).toBe('Table 1');
      expect(result.capacity).toBe(4);
      expect(result.section).toBe('Main Hall');
    });

    it('should throw NotFoundException when table is not found', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow('Table nonexistent not found');
    });
  });

  describe('findByOutlet', () => {
    it('should return all active tables for an outlet', async () => {
      const tables = [
        makeTable({ id: 'table-1', name: 'Table 1' }),
        makeTable({ id: 'table-2', name: 'Table 2' }),
      ];
      (mockPrisma.table.findMany as jest.Mock).mockResolvedValue(tables);

      const result = await service.findByOutlet('outlet-1');

      expect(mockPrisma.table.findMany).toHaveBeenCalledWith({
        where: { outletId: 'outlet-1', isActive: true },
        orderBy: [{ section: 'asc' }, { name: 'asc' }],
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by section when provided', async () => {
      (mockPrisma.table.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByOutlet('outlet-1', { section: 'VIP' });

      expect(mockPrisma.table.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ section: 'VIP' }),
        orderBy: [{ section: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter by status when provided', async () => {
      (mockPrisma.table.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByOutlet('outlet-1', { status: 'occupied' });

      expect(mockPrisma.table.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'occupied' }),
        orderBy: [{ section: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('create', () => {
    it('should create a new table successfully', async () => {
      (mockPrisma.table.findFirst as jest.Mock).mockResolvedValue(null);
      const created = makeTable({ id: 'table-new', name: 'Table 10' });
      (mockPrisma.table.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create({
        outletId: 'outlet-1',
        name: 'Table 10',
        capacity: 6,
        section: 'Outdoor',
      });

      expect(mockPrisma.table.findFirst).toHaveBeenCalledWith({
        where: { outletId: 'outlet-1', name: 'Table 10', isActive: true },
      });
      expect(mockPrisma.table.create).toHaveBeenCalledWith({
        data: {
          outletId: 'outlet-1',
          name: 'Table 10',
          capacity: 6,
          section: 'Outdoor',
          positionX: null,
          positionY: null,
        },
      });
      expect(result.id).toBe('table-new');
    });

    it('should throw when table name already exists in outlet', async () => {
      (mockPrisma.table.findFirst as jest.Mock).mockResolvedValue(makeTable());

      await expect(
        service.create({ outletId: 'outlet-1', name: 'Table 1' }),
      ).rejects.toThrow('Table with this name already exists in the outlet');
    });

    it('should default capacity to 4 if not provided', async () => {
      (mockPrisma.table.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.table.create as jest.Mock).mockResolvedValue(makeTable());

      await service.create({ outletId: 'outlet-1', name: 'Table X' });

      expect(mockPrisma.table.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ capacity: 4 }),
      });
    });
  });

  describe('update', () => {
    it('should update a table successfully', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(makeTable());
      const updated = makeTable({ name: 'VIP Table 1', capacity: 8 });
      (mockPrisma.table.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('table-1', {
        name: 'VIP Table 1',
        capacity: 8,
      });

      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'table-1' },
        data: { name: 'VIP Table 1', capacity: 8 },
      });
      expect(result.name).toBe('VIP Table 1');
      expect(result.capacity).toBe(8);
    });

    it('should throw NotFoundException when table does not exist', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should deactivate a table by setting isActive to false', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(makeTable());
      (mockPrisma.table.update as jest.Mock).mockResolvedValue({});

      await service.softDelete('table-1');

      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'table-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when table does not exist', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw when trying to deactivate an occupied table', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(
        makeTable({ status: 'occupied' }),
      );

      await expect(service.softDelete('table-1')).rejects.toThrow(
        'Cannot deactivate an occupied table',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update table status to occupied with order reference', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(makeTable());
      const updated = makeTable({
        status: 'occupied',
        currentOrderId: 'order-1',
        occupiedAt: now,
      });
      (mockPrisma.table.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateStatus('table-1', 'occupied', 'order-1');

      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'table-1' },
        data: {
          status: 'occupied',
          currentOrderId: 'order-1',
          occupiedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe('occupied');
      expect(result.currentOrderId).toBe('order-1');
    });

    it('should clear occupiedAt when status is not occupied', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(
        makeTable({ status: 'occupied' }),
      );
      const updated = makeTable({
        status: 'available',
        currentOrderId: null,
        occupiedAt: null,
      });
      (mockPrisma.table.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateStatus('table-1', 'available');

      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'table-1' },
        data: {
          status: 'available',
          currentOrderId: null,
          occupiedAt: null,
        },
      });
      expect(result.status).toBe('available');
      expect(result.occupiedAt).toBeNull();
    });

    it('should throw NotFoundException when table does not exist', async () => {
      (mockPrisma.table.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', 'available')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
