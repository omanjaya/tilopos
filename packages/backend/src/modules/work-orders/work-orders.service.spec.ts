import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant/tenant-access.service';
import type { DocumentNumberService } from '@shared/numbering/document-number.service';
import { EMPLOYEE_PUBLIC_SELECT } from '@shared/constants/selects';
import { WorkOrdersService } from './work-orders.service';
import { AppointmentsService } from '../appointments/appointments.service';

const BIZ = 'biz-a';

function build() {
  const tx = {
    workOrder: { create: jest.fn().mockResolvedValue({ id: 'wo-1' }) },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    workOrder: { findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const tenant = {
    assertOwned: jest.fn().mockResolvedValue(undefined),
  };
  const numbers = { next: jest.fn().mockResolvedValue('WO-20260927-0001') };
  const service = new WorkOrdersService(
    prisma as unknown as PrismaService,
    tenant as unknown as TenantAccessService,
    numbers as unknown as DocumentNumberService,
  );
  return { prisma, tx, tenant, numbers, service };
}

describe('WorkOrdersService', () => {
  it('verifies outlet, customer and employee ownership before creating', async () => {
    const { service, tenant, tx } = build();
    tenant.assertOwned.mockImplementation((model: string) =>
      model === 'employee' ? Promise.reject(new ForbiddenException()) : Promise.resolve(),
    );

    await expect(
      service.create(BIZ, { outletId: 'o1', employeeId: 'foreign-owner', title: 'Fix' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.workOrder.create).not.toHaveBeenCalled();
  });

  it('never includes the full employee row and numbers atomically per business', async () => {
    const { service, tx, numbers } = build();

    await service.create(BIZ, {
      outletId: 'o1',
      title: 'Fix',
      items: [{ description: 'Labor', type: 'labor', quantity: 1.5, unitPrice: 10000 }],
    });

    const args = tx.workOrder.create.mock.calls[0][0];
    expect(args.include.employee).toEqual({ select: EMPLOYEE_PUBLIC_SELECT });
    expect(numbers.next).toHaveBeenCalledWith(tx, BIZ, 'WO', { daily: true, pad: 4 });
    expect(args.data.items.create[0].subtotal.toString()).toBe('15000');
  });

  it('rejects invalid status transitions', async () => {
    const { service, prisma } = build();
    prisma.workOrder.findFirst.mockResolvedValue({ status: 'delivered' });

    await expect(service.updateStatus('wo-1', BIZ, 'pending')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.workOrder.updateMany).not.toHaveBeenCalled();
  });
});

describe('AppointmentsService', () => {
  it('rejects a customer from another business before writing', async () => {
    const prisma = { $transaction: jest.fn() };
    const tenant = {
      assertOwned: jest.fn((model: string) =>
        model === 'customer' ? Promise.reject(new ForbiddenException()) : Promise.resolve(),
      ),
    };
    const service = new AppointmentsService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
    );

    await expect(
      service.create(BIZ, {
        outletId: 'o1',
        customerId: 'foreign',
        serviceName: 'Cut',
        servicePrice: 50000,
        startTime: '2026-09-27T03:00:00.000Z',
        durationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists a WIB business day', async () => {
    const prisma = { appointment: { findMany: jest.fn().mockResolvedValue([]) } };
    const tenant = { assertOwned: jest.fn().mockResolvedValue(undefined) };
    const service = new AppointmentsService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
    );

    await service.listByDate('o1', BIZ, '2026-09-27');

    const where = prisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.startTime.gte.toISOString()).toBe('2026-09-26T17:00:00.000Z');
    expect(where.startTime.lte.toISOString()).toBe('2026-09-27T16:59:59.999Z');
  });
});
