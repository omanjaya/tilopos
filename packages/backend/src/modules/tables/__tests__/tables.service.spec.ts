import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TablesService } from '../tables.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';

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
  createdAt: new Date(),
  ...overrides,
});

function buildPrisma() {
  const prisma = {
    table: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    order: { findFirst: jest.fn() },
    waitingList: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return prisma;
}

describe('TablesService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: TablesService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new TablesService(prisma as unknown as PrismaService);
  });

  describe('findById', () => {
    it('scopes the lookup to the caller business', async () => {
      prisma.table.findFirst.mockResolvedValue(makeTable());
      const result = await service.findById('table-1', 'biz-1');
      expect(prisma.table.findFirst).toHaveBeenCalledWith({
        where: { id: 'table-1', outlet: { businessId: 'biz-1' } },
      });
      expect(result.id).toBe('table-1');
    });

    it('throws 404 for a table of another business', async () => {
      prisma.table.findFirst.mockResolvedValue(null);
      await expect(service.findById('table-x', 'biz-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('rejects a currentOrderId that is not an order of the table outlet', async () => {
      prisma.table.findFirst.mockResolvedValue(makeTable());
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus('table-1', 'biz-1', 'occupied', 'foreign-order'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'foreign-order', outletId: 'outlet-1' },
        select: { id: true },
      });
      expect(prisma.table.update).not.toHaveBeenCalled();
    });

    it('links an order of the same outlet', async () => {
      prisma.table.findFirst.mockResolvedValue(makeTable());
      prisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
      prisma.table.update.mockResolvedValue(
        makeTable({ status: 'occupied', currentOrderId: 'order-1' }),
      );

      const result = await service.updateStatus('table-1', 'biz-1', 'occupied', 'order-1');
      expect(result.currentOrderId).toBe('order-1');
    });
  });

  describe('getSections', () => {
    it('queries only the given outlets and never runs without outlets', async () => {
      expect(await service.getSections([])).toEqual([]);
      expect(prisma.table.findMany).not.toHaveBeenCalled();

      prisma.table.findMany.mockResolvedValue([{ section: 'A' }, { section: null }]);
      expect(await service.getSections(['outlet-1'])).toEqual(['A']);
      expect(prisma.table.findMany.mock.calls[0][0].where.outletId).toEqual({ in: ['outlet-1'] });
    });
  });

  describe('getReservations', () => {
    it('uses the Asia/Jakarta business day', async () => {
      prisma.waitingList.findMany.mockResolvedValue([]);
      await service.getReservations(['outlet-1'], '2026-09-27');
      const where = prisma.waitingList.findMany.mock.calls[0][0].where;
      expect(where.queuedAt.gte.toISOString()).toBe('2026-09-26T17:00:00.000Z');
      expect(where.queuedAt.lte.toISOString()).toBe('2026-09-27T16:59:59.999Z');
    });

    it('rejects malformed dates', async () => {
      await expect(service.getReservations(['outlet-1'], '27/09/2026')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkInReservation', () => {
    const reservation = {
      id: 'res-1',
      outletId: 'outlet-1',
      tableId: 'table-1',
      status: 'waiting',
      notes: '[RESERVATION]',
    };

    it('fails (and rolls back) when the reserved table is occupied by someone else', async () => {
      prisma.waitingList.findFirst.mockResolvedValue(reservation);
      prisma.waitingList.updateMany.mockResolvedValue({ count: 1 });
      prisma.table.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.checkInReservation('res-1', 'biz-1')).rejects.toThrow(ConflictException);
      expect(prisma.table.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'table-1',
          outletId: 'outlet-1',
          status: { in: ['available', 'reserved'] },
        },
        data: expect.objectContaining({ status: 'occupied' }),
      });
    });

    it('only accepts reservation rows of the caller business', async () => {
      prisma.waitingList.findFirst.mockResolvedValue(null);
      await expect(service.checkInReservation('res-1', 'biz-2')).rejects.toThrow(NotFoundException);
      expect(prisma.waitingList.findFirst.mock.calls[0][0].where).toEqual({
        id: 'res-1',
        outlet: { businessId: 'biz-2' },
        notes: { startsWith: '[RESERVATION]' },
      });
    });
  });

  describe('cancelReservation', () => {
    it('rejects a second cancel (conditional update count 0)', async () => {
      prisma.waitingList.findFirst.mockResolvedValue({
        id: 'res-1',
        outletId: 'outlet-1',
        tableId: 'table-1',
        status: 'cancelled',
        notes: '[RESERVATION]',
      });
      prisma.waitingList.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.cancelReservation('res-1', 'biz-1')).rejects.toThrow(ConflictException);
      expect(prisma.table.updateMany).not.toHaveBeenCalled();
    });
  });
});
