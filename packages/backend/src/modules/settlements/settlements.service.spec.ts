import { ConflictException, NotFoundException } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';

const user: AuthUser = { employeeId: 'e-1', businessId: 'b-1', outletId: null, role: 'owner' };

function setup() {
  const tx = {
    paymentSettlement: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn().mockResolvedValue({ id: 's-1', status: 'settled' }),
      create: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    paymentSettlement: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  };
  const tenant = {
    assertOutlet: jest.fn(async (_u: unknown, id: string) => id),
    resolveOutletIds: jest.fn().mockResolvedValue(['o-1']),
  };
  const service = new SettlementsService(
    prisma as unknown as PrismaService,
    tenant as unknown as TenantAccessService,
  );
  return { tx, prisma, tenant, service };
}

describe('SettlementsService', () => {
  it('settle is scoped by business and requires status pending', async () => {
    const { tx, service } = setup();
    tx.paymentSettlement.findFirst.mockResolvedValue({
      id: 's-1',
      outletId: 'o-1',
      status: 'pending',
      metadata: {},
    });
    tx.paymentSettlement.updateMany.mockResolvedValue({ count: 1 });

    await service.settle(user, 's-1', 'ok');

    expect(tx.paymentSettlement.findFirst.mock.calls[0][0].where).toEqual({
      id: 's-1',
      outlet: { businessId: 'b-1' },
    });
    expect(tx.paymentSettlement.updateMany.mock.calls[0][0].where).toEqual({
      id: 's-1',
      outlet: { businessId: 'b-1' },
      status: 'pending',
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('returns 404 for a settlement of another business', async () => {
    const { tx, service } = setup();
    tx.paymentSettlement.findFirst.mockResolvedValue(null);
    await expect(service.settle(user, 's-x')).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.paymentSettlement.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to re-settle or dispute a non-pending settlement', async () => {
    const { tx, service } = setup();
    tx.paymentSettlement.findFirst.mockResolvedValue({
      id: 's-1',
      outletId: 'o-1',
      status: 'settled',
      metadata: {},
    });
    tx.paymentSettlement.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.dispute(user, 's-1', 'wrong')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('manual create verifies outlet ownership and net = gross - fee', async () => {
    const { tenant, tx, service } = setup();
    await expect(
      service.create(user, {
        outletId: 'o-1',
        paymentMethod: 'qris',
        settlementDate: '2026-09-26',
        totalTransactions: 1,
        grossAmount: 1000,
        feeAmount: 7,
        netAmount: 1000,
      }),
    ).rejects.toThrow('netAmount must equal');
    expect(tenant.assertOutlet).toHaveBeenCalledWith(user, 'o-1');
    expect(tx.paymentSettlement.create).not.toHaveBeenCalled();
  });

  it('list scopes by resolved outlets and business', async () => {
    const { prisma, tenant, service } = setup();
    await service.list(user, { outletId: 'o-1', page: 1, limit: 20 });
    expect(tenant.resolveOutletIds).toHaveBeenCalledWith(user, 'o-1');
    expect(prisma.paymentSettlement.findMany.mock.calls[0][0]).toMatchObject({
      where: { outletId: { in: ['o-1'] }, outlet: { businessId: 'b-1' } },
      take: 20,
    });
  });
});
