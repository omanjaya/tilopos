import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmployeeManagementService } from './employee-management.service';
import { EmployeeScheduleService } from './employee-schedule.service';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import type { LogAuditEventUseCase } from '../../application/use-cases/audit/log-audit-event.use-case';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import type { UpdateEmployeeDto } from '../../application/dtos/employee.dto';

const owner: AuthUser = { employeeId: 'own-1', businessId: 'biz-1', outletId: null, role: 'owner' };
const manager: AuthUser = {
  employeeId: 'mgr-1',
  businessId: 'biz-1',
  outletId: 'outlet-a',
  role: 'manager',
};
const supervisor: AuthUser = { ...manager, employeeId: 'sup-1', role: 'supervisor' };
const cashier: AuthUser = { ...manager, employeeId: 'cash-1', role: 'cashier' };

const row = (over: Record<string, unknown> = {}) => ({
  id: 'emp-1',
  name: 'Budi',
  email: 'budi@example.com',
  phone: null,
  role: 'cashier',
  outletId: 'outlet-a',
  hourlyRate: new Prisma.Decimal(25000),
  isActive: true,
  businessId: 'biz-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  outlet: { name: 'Outlet A' },
  ...over,
});

describe('EmployeeManagementService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let tenant: jest.Mocked<TenantAccessService>;
  let audit: jest.Mocked<LogAuditEventUseCase>;
  let service: EmployeeManagementService;

  beforeEach(() => {
    prisma = {
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    tenant = {
      assertOutlet: jest.fn().mockImplementation(async (_u, id) => id),
      resolveOutletIds: jest.fn(),
      assertOwned: jest.fn(),
    } as unknown as jest.Mocked<TenantAccessService>;
    audit = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<LogAuditEventUseCase>;
    service = new EmployeeManagementService(prisma as PrismaService, tenant, audit);
  });

  describe('list', () => {
    it('lists active employees of the business by default', async () => {
      prisma.employee.findMany.mockResolvedValue([row()]);
      await service.list(owner, {});
      const where = prisma.employee.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ businessId: 'biz-1', isActive: true });
    });

    it('filters by status, role and search (inactive employees can be listed)', async () => {
      prisma.employee.findMany.mockResolvedValue([]);
      await service.list(owner, { status: 'inactive', role: 'cashier', search: ' budi ' });
      const where = prisma.employee.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ businessId: 'biz-1', isActive: false, role: 'cashier' });
      expect(where.OR[0]).toEqual({ name: { contains: 'budi', mode: 'insensitive' } });

      await service.list(owner, { status: 'all' });
      expect(prisma.employee.findMany.mock.calls[1][0].where).toEqual({ businessId: 'biz-1' });
    });
  });

  describe('loadInBusiness', () => {
    it('scopes the lookup by the caller business and 404s otherwise', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      await expect(service.loadInBusiness(manager, 'emp-x')).rejects.toThrow(NotFoundException);
      expect(prisma.employee.findFirst.mock.calls[0][0].where).toEqual({
        id: 'emp-x',
        businessId: 'biz-1',
      });
    });
  });

  describe('assertCanActOn (shift / attendance on behalf)', () => {
    const colleague = { id: 'cash-2', outletId: 'outlet-a', role: 'cashier' };

    it('always allows acting on yourself', () => {
      expect(() =>
        service.assertCanActOn(cashier, { id: 'cash-1', outletId: 'outlet-a', role: 'cashier' }),
      ).not.toThrow();
    });

    it('forbids a cashier acting on a colleague', () => {
      expect(() => service.assertCanActOn(cashier, colleague)).toThrow(ForbiddenException);
    });

    it('allows a supervisor on a cashier of the same outlet', () => {
      expect(() => service.assertCanActOn(supervisor, colleague)).not.toThrow();
    });

    it('forbids a supervisor on a cashier of another outlet', () => {
      expect(() =>
        service.assertCanActOn(supervisor, { ...colleague, outletId: 'outlet-b' }),
      ).toThrow(ForbiddenException);
    });

    it('forbids acting on an equal or higher role', () => {
      expect(() =>
        service.assertCanActOn(supervisor, { id: 'mgr-2', outletId: 'outlet-a', role: 'manager' }),
      ).toThrow(ForbiddenException);
    });

    it('requires manager+ when asked (e.g. reading attendance of others)', () => {
      expect(() => service.assertCanActOn(supervisor, colleague, 'manager' as never)).toThrow(
        ForbiddenException,
      );
      expect(() => service.assertCanActOn(manager, colleague, 'manager' as never)).not.toThrow();
    });
  });

  describe('deactivate', () => {
    it('forbids a manager deactivating the owner', async () => {
      prisma.employee.findFirst.mockResolvedValue(row({ id: 'own-1', role: 'owner' }));
      await expect(service.deactivate(manager, 'own-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.employee.updateMany).not.toHaveBeenCalled();
    });

    it('forbids a manager deactivating another manager', async () => {
      prisma.employee.findFirst.mockResolvedValue(row({ id: 'mgr-2', role: 'manager' }));
      await expect(service.deactivate(manager, 'mgr-2')).rejects.toThrow(ForbiddenException);
    });

    it('forbids self-deactivation', async () => {
      await expect(service.deactivate(owner, 'own-1')).rejects.toThrow(ForbiddenException);
    });

    it('deactivates a lower role with a tenant-scoped update', async () => {
      prisma.employee.findFirst.mockResolvedValue(row());
      await service.deactivate(manager, 'emp-1');
      expect(prisma.employee.updateMany).toHaveBeenCalledWith({
        where: { id: 'emp-1', businessId: 'biz-1' },
        data: { isActive: false },
      });
    });
  });

  describe('create', () => {
    it('rejects an outlet outside the business', async () => {
      tenant.assertOutlet.mockRejectedValue(new ForbiddenException());
      await expect(
        service.create(owner, { name: 'X', role: 'cashier', outletId: 'foreign' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.employee.create).not.toHaveBeenCalled();
    });

    it('stops a manager from placing an employee in another outlet', async () => {
      await expect(
        service.create(manager, { name: 'X', role: 'cashier', outletId: 'outlet-b' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an email already used by an active employee (case-insensitive)', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'someone' });
      await expect(
        service.create(owner, { name: 'X', role: 'cashier', email: 'Victim@Example.com' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.employee.findFirst.mock.calls[0][0].where.email).toEqual({
        equals: 'Victim@Example.com',
        mode: 'insensitive',
      });
    });
  });

  describe('update', () => {
    it('never returns pin, mfaSecret or googleId', async () => {
      prisma.employee.findFirst
        .mockResolvedValueOnce(row()) // loadInBusiness
        .mockResolvedValueOnce(null); // email check
      prisma.employee.update.mockResolvedValue(row({ name: 'Budi 2' }));

      const dto: UpdateEmployeeDto = { name: 'Budi 2', pin: '123456', email: 'b2@example.com' };
      const result = await service.update(manager, 'emp-1', dto);

      expect(result.name).toBe('Budi 2');
      expect(result).not.toHaveProperty('pin');
      expect(result).not.toHaveProperty('mfaSecret');
      expect(result).not.toHaveProperty('googleId');
      const select = prisma.employee.update.mock.calls[0][0].select;
      expect(select.pin).toBeUndefined();
      expect(select.mfaSecret).toBeUndefined();
    });

    it('validates a new outletId against the business', async () => {
      prisma.employee.findFirst.mockResolvedValue(row());
      tenant.assertOutlet.mockRejectedValue(new ForbiddenException());
      await expect(service.update(owner, 'emp-1', { outletId: 'foreign' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.employee.update).not.toHaveBeenCalled();
    });
  });
});

describe('EmployeeScheduleService tenant scope', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  let service: EmployeeScheduleService;

  beforeEach(() => {
    prisma = {
      employeeSchedule: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => unknown) => fn(prisma)),
    };
    service = new EmployeeScheduleService(prisma as PrismaService);
  });

  it('deletes only schedules of the caller business', async () => {
    await expect(service.deleteSchedule('sched-1', 'biz-1', 'outlet-a')).rejects.toThrow(
      'Schedule entry not found',
    );
    expect(prisma.employeeSchedule.deleteMany).toHaveBeenCalledWith({
      where: { id: 'sched-1', employee: { businessId: 'biz-1' }, outletId: 'outlet-a' },
    });
  });

  it('does not update a schedule of another business', async () => {
    await expect(service.updateSchedule('sched-1', { notes: 'x' }, 'biz-1')).rejects.toThrow(
      'Schedule entry not found',
    );
    expect(prisma.employeeSchedule.findFirst.mock.calls[0][0].where).toEqual({
      id: 'sched-1',
      employee: { businessId: 'biz-1' },
    });
    expect(prisma.employeeSchedule.update).not.toHaveBeenCalled();
  });

  it('rejects an update that overlaps another schedule', async () => {
    prisma.employeeSchedule.findFirst
      .mockResolvedValueOnce({
        id: 'sched-1',
        employeeId: 'emp-1',
        outletId: 'outlet-a',
        date: new Date('2026-02-01T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '12:00',
      })
      .mockResolvedValueOnce({ startTime: '13:00', endTime: '17:00' });

    await expect(service.updateSchedule('sched-1', { endTime: '15:00' }, 'biz-1')).rejects.toThrow(
      /tumpang tindih/,
    );
  });
});
