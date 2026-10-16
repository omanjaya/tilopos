import { ForbiddenException } from '@nestjs/common';
import { TablesController } from '../tables.controller';
import { TenantAccessService } from '../../../shared/tenant/tenant-access.service';
import { GetTablesUseCase } from '../../../application/use-cases/tables/get-tables.use-case';
import { TablesService } from '../tables.service';
import { WaitingListService } from '../../waiting-list/waiting-list.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';

const user: AuthUser = {
  employeeId: 'emp-1',
  businessId: 'biz-1',
  outletId: null,
  role: 'owner',
};

function buildPrisma() {
  return {
    outlet: {
      findMany: jest.fn().mockResolvedValue([{ id: 'outlet-a' }, { id: 'outlet-b' }]),
      count: jest.fn(),
    },
    table: { findMany: jest.fn().mockResolvedValue([]) },
    waitingList: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function buildController(prisma: ReturnType<typeof buildPrisma>) {
  const p = prisma as unknown as PrismaService;
  const noop = {} as never;
  return new TablesController(
    noop,
    new GetTablesUseCase(p),
    noop,
    noop,
    noop,
    noop,
    new TablesService(p),
    new WaitingListService(p),
    new TenantAccessService(p),
  );
}

describe('TablesController tenant scoping', () => {
  it('GET /tables without outletId lists only outlets of the caller business', async () => {
    const prisma = buildPrisma();
    await buildController(prisma).list({}, user);

    expect(prisma.outlet.findMany).toHaveBeenCalledWith({
      where: { businessId: 'biz-1' },
      select: { id: true },
    });
    expect(prisma.table.findMany.mock.calls[0][0].where.outletId).toEqual({
      in: ['outlet-a', 'outlet-b'],
    });
  });

  it('GET /tables with a foreign outletId is rejected before any table query', async () => {
    const prisma = buildPrisma();
    prisma.outlet.count.mockResolvedValue(0);
    await expect(buildController(prisma).list({ outletId: 'foreign' }, user)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.table.findMany).not.toHaveBeenCalled();
  });

  it('GET /tables/sections without outletId stays inside the business', async () => {
    const prisma = buildPrisma();
    await buildController(prisma).getSections({}, user);
    expect(prisma.table.findMany.mock.calls[0][0].where.outletId).toEqual({
      in: ['outlet-a', 'outlet-b'],
    });
  });

  it('GET /tables/waiting-list without outletId stays inside the business', async () => {
    const prisma = buildPrisma();
    await buildController(prisma).waitingList({}, user);
    for (const call of prisma.waitingList.findMany.mock.calls) {
      expect(call[0].where.outletId).toEqual({ in: ['outlet-a', 'outlet-b'] });
    }
    expect(prisma.waitingList.findMany).toHaveBeenCalled();
  });
});
