import { ConflictException, NotFoundException } from '@nestjs/common';
import { WaitingListController } from '../waiting-list.controller';
import { WaitingListService } from '../waiting-list.service';
import { TenantAccessService } from '../../../shared/tenant/tenant-access.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

const user: AuthUser = {
  employeeId: 'emp-1',
  businessId: 'biz-1',
  outletId: null,
  role: 'cashier',
};

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 'wl-1',
  outletId: 'outlet-a',
  customerName: 'Budi',
  customerPhone: '0812',
  partySize: 2,
  status: 'waiting',
  tableId: null,
  notes: null,
  queuedAt: new Date(),
  table: null,
  ...overrides,
});

function buildPrisma() {
  const prisma = {
    outlet: {
      findMany: jest.fn().mockResolvedValue([{ id: 'outlet-a' }]),
      count: jest.fn(),
    },
    waitingList: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn(),
    },
    table: { findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return prisma;
}

describe('WaitingList tenant scoping & state machine', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: WaitingListService;
  let controller: WaitingListController;

  beforeEach(() => {
    prisma = buildPrisma();
    const p = prisma as unknown as PrismaService;
    service = new WaitingListService(p);
    controller = new WaitingListController(service, new TenantAccessService(p));
  });

  it('GET /waiting-list without outletId only reads outlets of the caller business', async () => {
    await controller.findByOutlet({}, user);
    expect(prisma.outlet.findMany).toHaveBeenCalledWith({
      where: { businessId: 'biz-1' },
      select: { id: true },
    });
    const where = prisma.waitingList.findMany.mock.calls[0][0].where;
    expect(where.outletId).toEqual({ in: ['outlet-a'] });
    expect(prisma.waitingList.findMany.mock.calls[0][0].take).toBeGreaterThan(0);
  });

  it('GET /waiting-list/stats without outletId is scoped to the business outlets', async () => {
    await controller.getStats({}, user);
    for (const call of prisma.waitingList.count.mock.calls) {
      expect(call[0].where.outletId).toEqual({ in: ['outlet-a'] });
    }
  });

  it('an entry of another business is a 404', async () => {
    prisma.waitingList.findFirst.mockResolvedValue(null);
    await expect(controller.cancel('wl-x', user)).rejects.toThrow(NotFoundException);
    expect(prisma.waitingList.findFirst.mock.calls[0][0].where).toEqual({
      id: 'wl-x',
      outlet: { businessId: 'biz-1' },
    });
  });

  it('seat with a table of another outlet/tenant is rejected and nothing is written', async () => {
    prisma.waitingList.findFirst.mockResolvedValue(entry());
    prisma.table.findFirst.mockResolvedValue(null);

    await expect(controller.seat('wl-1', { tableId: 'foreign-table' }, user)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.table.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-table', outletId: 'outlet-a' },
      select: { id: true },
    });
    expect(prisma.table.updateMany).not.toHaveBeenCalled();
    expect(prisma.waitingList.updateMany).not.toHaveBeenCalled();
  });

  it('seat claims the table only if it is still available', async () => {
    prisma.waitingList.findFirst.mockResolvedValue(entry());
    prisma.table.findFirst.mockResolvedValue({ id: 'table-1' });
    prisma.table.updateMany.mockResolvedValue({ count: 0 });

    await expect(controller.seat('wl-1', { tableId: 'table-1' }, user)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.table.updateMany.mock.calls[0][0].where).toEqual({
      id: 'table-1',
      outletId: 'outlet-a',
      isActive: true,
      status: 'available',
    });
    expect(prisma.waitingList.updateMany).not.toHaveBeenCalled();
  });

  it('rejects invalid transitions (seated -> waiting / cancelled)', async () => {
    prisma.waitingList.findFirst.mockResolvedValue(entry({ status: 'seated' }));
    await expect(controller.cancel('wl-1', user)).rejects.toThrow(ConflictException);
    await expect(controller.update('wl-1', { status: 'waiting' }, user)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.waitingList.updateMany).not.toHaveBeenCalled();
  });

  it('public position does not reveal the customer name', async () => {
    prisma.waitingList.findUnique
      .mockResolvedValueOnce({ status: 'waiting', notes: null })
      .mockResolvedValueOnce({ outletId: 'outlet-a', queuedAt: new Date(), status: 'waiting' });
    prisma.waitingList.count.mockResolvedValue(2);

    const result = await controller.publicGetPosition('wl-1');
    expect(result).toEqual({ status: 'waiting', position: 3, estimatedWait: 45 });
    expect(result).not.toHaveProperty('customerName');
  });
});
