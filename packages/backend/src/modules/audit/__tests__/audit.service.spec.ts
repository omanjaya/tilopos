import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService, csvEscape } from '../audit.service';
import { AUDIT_ACTIONS } from '../audit-actions';
import { ExportFormat, SuspiciousActivityType } from '../../../application/dtos/audit.dto';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';

describe('AuditService', () => {
  const BIZ = 'biz-1';
  let prisma: {
    auditLog: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
    transaction: { findMany: jest.Mock };
    employee: { findMany: jest.Mock };
    outlet: { findMany: jest.Mock };
  };
  let tenant: { assertOutlet: jest.Mock };
  let service: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn(), groupBy: jest.fn() },
      transaction: { findMany: jest.fn().mockResolvedValue([]) },
      employee: { findMany: jest.fn().mockResolvedValue([]) },
      outlet: { findMany: jest.fn().mockResolvedValue([]) },
    };
    tenant = { assertOutlet: jest.fn().mockResolvedValue('o1') };
    service = new AuditService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
    );
  });

  describe('suspicious activity detection uses the action names that are actually written', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-31T00:00:00Z');

    it('multiple voids query transaction_voided and flag >= 3 per WIB hour', async () => {
      const at = (m: number) => new Date(Date.UTC(2026, 0, 10, 3, m));
      prisma.auditLog.findMany.mockResolvedValue(
        [1, 2, 3].map((m) => ({
          employeeId: 'e1',
          outletId: 'o1',
          entityId: null,
          createdAt: at(m),
        })),
      );

      const res = await service.detectSuspiciousActivities(BIZ, start, end, [
        SuspiciousActivityType.MULTIPLE_VOIDS,
      ]);

      expect(prisma.auditLog.findMany.mock.calls[0][0].where.action).toEqual({
        in: [AUDIT_ACTIONS.TRANSACTION_VOIDED],
      });
      expect(res).toHaveLength(1);
      expect(res[0].details.hour).toBe('2026-01-10 10:00');
    });

    it('large refunds query transaction_refunded and read newValue.refundAmount', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          employeeId: 'e1',
          outletId: 'o1',
          entityType: 'transaction',
          entityId: 't1',
          createdAt: end,
          newValue: { refundAmount: 750_000 },
        },
      ]);

      const res = await service.detectSuspiciousActivities(BIZ, start, end, [
        SuspiciousActivityType.LARGE_REFUND,
      ]);

      expect(prisma.auditLog.findMany.mock.calls[0][0].where.action).toEqual({
        in: [AUDIT_ACTIONS.TRANSACTION_REFUNDED],
      });
      expect(res).toHaveLength(1);
    });

    it('after-hours uses the WIB hour, not server time', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        // 02:00 UTC = 09:00 WIB (inside hours)
        {
          employeeId: 'e1',
          outletId: 'o1',
          entityType: 'transaction',
          entityId: 't1',
          action: AUDIT_ACTIONS.TRANSACTION_CREATED,
          createdAt: new Date('2026-01-10T02:00:00Z'),
        },
        // 17:00 UTC = 00:00 WIB (after hours)
        {
          employeeId: 'e1',
          outletId: 'o1',
          entityType: 'transaction',
          entityId: 't2',
          action: AUDIT_ACTIONS.TRANSACTION_CREATED,
          createdAt: new Date('2026-01-10T17:00:00Z'),
        },
      ]);

      const res = await service.detectSuspiciousActivities(BIZ, start, end, [
        SuspiciousActivityType.AFTER_HOURS,
      ]);

      expect(res.map((r) => r.relatedEntityId)).toEqual(['t2']);
      expect(res[0].details.hour).toBe(0);
    });

    it('unusual discounts are read from transactions of the tenant', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 't1',
          outletId: 'o1',
          employeeId: 'e1',
          subtotal: new Prisma.Decimal(100_000),
          discountAmount: new Prisma.Decimal(60_000),
          createdAt: end,
        },
        {
          id: 't2',
          outletId: 'o1',
          employeeId: 'e1',
          subtotal: new Prisma.Decimal(100_000),
          discountAmount: new Prisma.Decimal(10_000),
          createdAt: end,
        },
      ]);

      const res = await service.detectSuspiciousActivities(BIZ, start, end, [
        SuspiciousActivityType.UNUSUAL_DISCOUNT,
      ]);

      expect(prisma.transaction.findMany.mock.calls[0][0].where.outlet).toEqual({
        businessId: BIZ,
      });
      expect(res.map((r) => r.relatedEntityId)).toEqual(['t1']);
    });

    it('verifies a client-supplied outletId belongs to the tenant', async () => {
      await service.detectSuspiciousActivities(BIZ, start, end, undefined, 'o-foreign');
      expect(tenant.assertOutlet).toHaveBeenCalledWith({ businessId: BIZ }, 'o-foreign');
    });
  });

  describe('resolveRange', () => {
    it('treats YYYY-MM-DD as WIB business days', () => {
      const { start, end } = service.resolveRange('2026-01-01', '2026-01-31');
      expect(start.toISOString()).toBe('2025-12-31T17:00:00.000Z');
      expect(end.toISOString()).toBe('2026-01-31T16:59:59.999Z');
    });

    it('rejects ranges longer than a year and inverted ranges', () => {
      expect(() => service.resolveRange('2024-01-01', '2026-01-01')).toThrow(BadRequestException);
      expect(() => service.resolveRange('2026-02-01', '2026-01-01')).toThrow(BadRequestException);
    });
  });

  describe('compliance export', () => {
    it('refuses exports above the row cap instead of loading everything', async () => {
      prisma.auditLog.count.mockResolvedValue(1_000_000);
      await expect(
        service.generateComplianceExport(BIZ, new Date(0), new Date(), ExportFormat.CSV),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('neutralises formulas in CSV cells', async () => {
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-01T00:00:00Z'),
          action: 'x',
          entityType: 'y',
          entityId: null,
          employeeId: 'e1',
          outletId: null,
          oldValue: null,
          newValue: null,
          ipAddress: null,
          deviceId: null,
        },
      ]);
      prisma.employee.findMany.mockResolvedValue([{ id: 'e1', name: '=HYPERLINK("http://x")' }]);

      const res = await service.generateComplianceExport(
        BIZ,
        new Date(0),
        new Date(),
        ExportFormat.CSV,
      );

      expect(res.data).toContain(`"'=HYPERLINK(""http://x"")"`);
      expect(prisma.employee.findMany.mock.calls[0][0].where).toEqual({
        id: { in: ['e1'] },
        businessId: BIZ,
      });
    });
  });

  describe('csvEscape', () => {
    it.each([
      ['plain', 'plain'],
      ['=1+1', "'=1+1"],
      ['+cmd', "'+cmd"],
      ['-2', "'-2"],
      ['@SUM(A1)', "'@SUM(A1)"],
      ['a,b', '"a,b"'],
      ['say "hi"', '"say ""hi"""'],
    ])('%s -> %s', (input, expected) => {
      expect(csvEscape(input)).toBe(expected);
    });
  });
});
