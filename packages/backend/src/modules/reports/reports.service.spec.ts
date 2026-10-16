import { ForbiddenException } from '@nestjs/common';
import { TenantAccessService } from '@shared/tenant';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import { ReportsService, type CustomReportConfig } from './reports.service';

const BUSINESS = 'biz-a';
const OWN_OUTLET = '11111111-1111-4111-8111-111111111111';
const FOREIGN_OUTLET = '22222222-2222-4222-8222-222222222222';
const user = { employeeId: 'e1', businessId: BUSINESS, outletId: null, role: 'owner' };

function setup() {
  const prisma = {
    outlet: {
      findMany: jest.fn().mockResolvedValue([{ id: OWN_OUTLET }]),
      count: jest.fn(async ({ where }: { where: { id: { in: string[] }; businessId: string } }) =>
        where.businessId === BUSINESS ? where.id.in.filter((id) => id === OWN_OUTLET).length : 0,
      ),
    },
    transaction: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const tenant = new TenantAccessService(prisma as unknown as PrismaService);
  const service = new ReportsService(prisma as unknown as PrismaService, tenant);
  return { prisma, service };
}

const baseConfig = (outletId?: string): CustomReportConfig => ({
  metrics: ['sales'],
  dimensions: ['date'],
  filters: outletId ? { outletId } : undefined,
  startDate: '2026-09-01',
  endDate: '2026-09-30',
});

describe('ReportsService.buildCustomReport tenant scoping', () => {
  it("rejects another tenant's outletId (F0934)", async () => {
    const { service, prisma } = setup();
    await expect(
      service.buildCustomReport(user, baseConfig(FOREIGN_OUTLET)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('scopes transactions to the verified outlet ids', async () => {
    const { service, prisma } = setup();
    await service.buildCustomReport(user, baseConfig(OWN_OUTLET));
    const where = prisma.transaction.findMany.mock.calls[0][0].where;
    expect(where.outletId).toEqual({ in: [OWN_OUTLET] });
    // WIB day boundaries: 2026-09-01 00:00 WIB .. 2026-09-30 23:59:59.999 WIB
    expect(where.createdAt.gte.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(where.createdAt.lte.toISOString()).toBe('2026-09-30T16:59:59.999Z');
  });

  it('defaults to every outlet of the caller business', async () => {
    const { service, prisma } = setup();
    await service.buildCustomReport(user, baseConfig());
    expect(prisma.outlet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: BUSINESS } }),
    );
    expect(prisma.transaction.findMany.mock.calls[0][0].where.outletId).toEqual({
      in: [OWN_OUTLET],
    });
  });
});
