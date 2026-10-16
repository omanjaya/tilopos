import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '@shared/tenant';
import { toPrismaPage } from '@shared/dtos/pagination-query.dto';
import { businessHour, parseBusinessDate } from '@shared/utils/business-time';
import {
  AUDIT_MAX_RANGE_DAYS,
  SuspiciousActivityType,
  ExportFormat,
  type SuspiciousActivityRecord,
  type AuditSummary,
  type ComplianceExportResult,
} from '../../application/dtos/audit.dto';
import { AUDIT_ACTIONS } from './audit-actions';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hard cap on rows loaded into memory by a single detector or export. */
export const AUDIT_ROW_CAP = 50_000;

const VOID_ACTIONS: string[] = [AUDIT_ACTIONS.TRANSACTION_VOIDED];
const REFUND_ACTIONS: string[] = [AUDIT_ACTIONS.TRANSACTION_REFUNDED];
const TRANSACTION_ACTIONS: string[] = [
  AUDIT_ACTIONS.TRANSACTION_CREATED,
  AUDIT_ACTIONS.TRANSACTION_VOIDED,
  AUDIT_ACTIONS.TRANSACTION_REFUNDED,
];

/** Thresholds for suspicious activity detection (configurable) */
const SUSPICIOUS_THRESHOLDS = {
  /** Max voids per employee in a 1-hour window before flagged */
  maxVoidsPerHour: 3,
  /** Discount percentage above which it is considered unusual */
  unusualDiscountPct: 50,
  /** Refund amount (IDR) above which it is considered large */
  largeRefundAmount: 500_000,
  /** Business hours range (24h) */
  businessHoursStart: 7,
  businessHoursEnd: 23,
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  // ========================================================================
  // DATE RANGE
  // ========================================================================

  /**
   * Resolves an optional date range. `YYYY-MM-DD` values are business days (WIB):
   * the start is the beginning and the end the last instant of that day.
   * Rejects invalid, inverted or too long ranges (400, never a Prisma 500).
   */
  resolveRange(startDate?: string, endDate?: string, defaultDays = 30): { start: Date; end: Date } {
    const parse = (value: string, edge: 'start' | 'end'): Date => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return parseBusinessDate(value)[edge];
      }
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(`Invalid date: ${value}`);
      }
      return d;
    };
    const end = endDate ? parse(endDate, 'end') : new Date();
    const start = startDate
      ? parse(startDate, 'start')
      : new Date(end.getTime() - defaultDays * DAY_MS);
    if (start > end) {
      throw new BadRequestException('startDate must be before endDate');
    }
    if (end.getTime() - start.getTime() > AUDIT_MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`Date range cannot exceed ${AUDIT_MAX_RANGE_DAYS} days`);
    }
    return { start, end };
  }

  // ========================================================================
  // LISTS (paginated)
  // ========================================================================

  async listLogs(
    businessId: string,
    start: Date,
    end: Date,
    page: { page?: number; limit?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: { businessId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      ...toPrismaPage(page),
    });
  }

  async listByEntity(
    businessId: string,
    entityType: string,
    entityId: string,
    page: { page?: number; limit?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: { businessId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      ...toPrismaPage(page),
    });
  }

  // ========================================================================
  // SUSPICIOUS ACTIVITY DETECTION
  // ========================================================================

  /**
   * Detect suspicious activities within the given date range.
   *
   * Patterns detected:
   * - Multiple voids in a short time (audit action transaction_voided)
   * - Unusual discount amounts (transactions.discount_amount vs subtotal)
   * - After-hours transactions (business hours in WIB)
   * - Large refunds (audit action transaction_refunded, newValue.refundAmount)
   */
  async detectSuspiciousActivities(
    businessId: string,
    startDate: Date,
    endDate: Date,
    types?: SuspiciousActivityType[],
    outletId?: string,
  ): Promise<SuspiciousActivityRecord[]> {
    const typesToCheck = types && types.length > 0 ? types : Object.values(SuspiciousActivityType);

    if (outletId) {
      await this.tenant.assertOutlet({ businessId } as Pick<AuthUser, 'businessId'>, outletId);
    }

    const results: SuspiciousActivityRecord[] = [];

    const baseWhere = {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
      ...(outletId ? { outletId } : {}),
    };

    // ---- Multiple voids ----
    if (typesToCheck.includes(SuspiciousActivityType.MULTIPLE_VOIDS)) {
      const voidLogs = await this.prisma.auditLog.findMany({
        where: { ...baseWhere, action: { in: VOID_ACTIONS } },
        orderBy: { createdAt: 'asc' },
        take: AUDIT_ROW_CAP,
      });

      const voidsByEmployee = this.groupByField(voidLogs, 'employeeId');

      for (const [empId, logs] of Object.entries(voidsByEmployee)) {
        const hourBuckets = this.groupByHour(logs);
        for (const [hourKey, bucket] of Object.entries(hourBuckets)) {
          if (bucket.length >= SUSPICIOUS_THRESHOLDS.maxVoidsPerHour) {
            results.push({
              type: SuspiciousActivityType.MULTIPLE_VOIDS,
              severity:
                bucket.length >= SUSPICIOUS_THRESHOLDS.maxVoidsPerHour * 2 ? 'high' : 'medium',
              description: `Employee performed ${bucket.length} voids within 1 hour (${hourKey})`,
              employeeId: empId || null,
              outletId: bucket[0]?.outletId ?? null,
              occurredAt: bucket[0]?.createdAt ?? new Date(),
              relatedEntityType: 'transaction',
              relatedEntityId: bucket[0]?.entityId ?? null,
              details: {
                count: bucket.length,
                hour: hourKey,
                threshold: SUSPICIOUS_THRESHOLDS.maxVoidsPerHour,
              },
            });
          }
        }
      }
    }

    // ---- Unusual discounts ----
    // Discounts are not audit-logged individually; read them from the transactions.
    if (typesToCheck.includes(SuspiciousActivityType.UNUSUAL_DISCOUNT)) {
      const discounted = await this.prisma.transaction.findMany({
        where: {
          outlet: { businessId },
          ...(outletId ? { outletId } : {}),
          createdAt: { gte: startDate, lte: endDate },
          discountAmount: { gt: 0 },
          subtotal: { gt: 0 },
        },
        select: {
          id: true,
          outletId: true,
          employeeId: true,
          subtotal: true,
          discountAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: AUDIT_ROW_CAP,
      });

      for (const trx of discounted) {
        const discountPct = new Prisma.Decimal(trx.discountAmount)
          .div(trx.subtotal)
          .mul(100)
          .toDecimalPlaces(2)
          .toNumber();

        if (discountPct >= SUSPICIOUS_THRESHOLDS.unusualDiscountPct) {
          results.push({
            type: SuspiciousActivityType.UNUSUAL_DISCOUNT,
            severity: discountPct >= 80 ? 'high' : 'medium',
            description: `Discount of ${discountPct}% applied (threshold: ${SUSPICIOUS_THRESHOLDS.unusualDiscountPct}%)`,
            employeeId: trx.employeeId,
            outletId: trx.outletId,
            occurredAt: trx.createdAt,
            relatedEntityType: 'transaction',
            relatedEntityId: trx.id,
            details: {
              discountPercentage: discountPct,
              discountAmount: Number(trx.discountAmount),
              subtotal: Number(trx.subtotal),
              threshold: SUSPICIOUS_THRESHOLDS.unusualDiscountPct,
            },
          });
        }
      }
    }

    // ---- After-hours transactions ----
    if (typesToCheck.includes(SuspiciousActivityType.AFTER_HOURS)) {
      const allLogs = await this.prisma.auditLog.findMany({
        where: {
          ...baseWhere,
          action: { in: TRANSACTION_ACTIONS },
        },
        orderBy: { createdAt: 'desc' },
        take: AUDIT_ROW_CAP,
      });

      for (const log of allLogs) {
        const hour = businessHour(log.createdAt);
        if (
          hour < SUSPICIOUS_THRESHOLDS.businessHoursStart ||
          hour >= SUSPICIOUS_THRESHOLDS.businessHoursEnd
        ) {
          results.push({
            type: SuspiciousActivityType.AFTER_HOURS,
            severity: 'low',
            description: `Transaction activity at ${log.createdAt.toISOString()} (outside business hours ${SUSPICIOUS_THRESHOLDS.businessHoursStart}:00 - ${SUSPICIOUS_THRESHOLDS.businessHoursEnd}:00)`,
            employeeId: log.employeeId,
            outletId: log.outletId,
            occurredAt: log.createdAt,
            relatedEntityType: log.entityType,
            relatedEntityId: log.entityId,
            details: { hour, action: log.action },
          });
        }
      }
    }

    // ---- Large refunds ----
    if (typesToCheck.includes(SuspiciousActivityType.LARGE_REFUND)) {
      const refundLogs = await this.prisma.auditLog.findMany({
        where: { ...baseWhere, action: { in: REFUND_ACTIONS } },
        orderBy: { createdAt: 'desc' },
        take: AUDIT_ROW_CAP,
      });

      for (const log of refundLogs) {
        const newVal = log.newValue as Record<string, unknown> | null;
        const refundAmount = Number(newVal?.refundAmount ?? newVal?.amount ?? newVal?.total ?? 0);

        if (refundAmount >= SUSPICIOUS_THRESHOLDS.largeRefundAmount) {
          results.push({
            type: SuspiciousActivityType.LARGE_REFUND,
            severity:
              refundAmount >= SUSPICIOUS_THRESHOLDS.largeRefundAmount * 2 ? 'high' : 'medium',
            description: `Refund of Rp ${refundAmount.toLocaleString('id-ID')} (threshold: Rp ${SUSPICIOUS_THRESHOLDS.largeRefundAmount.toLocaleString('id-ID')})`,
            employeeId: log.employeeId,
            outletId: log.outletId,
            occurredAt: log.createdAt,
            relatedEntityType: log.entityType,
            relatedEntityId: log.entityId,
            details: { refundAmount, threshold: SUSPICIOUS_THRESHOLDS.largeRefundAmount },
          });
        }
      }
    }

    // Sort by severity then date
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    results.sort((a, b) => {
      const sevDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      if (sevDiff !== 0) return sevDiff;
      return b.occurredAt.getTime() - a.occurredAt.getTime();
    });

    return results;
  }

  // ========================================================================
  // COMPLIANCE EXPORT
  // ========================================================================

  /**
   * Generate a compliance export of audit logs for tax / regulatory purposes.
   */
  async generateComplianceExport(
    businessId: string,
    startDate: Date,
    endDate: Date,
    format: ExportFormat,
    actionTypes?: string[],
    employeeId?: string,
  ): Promise<ComplianceExportResult> {
    const where: Prisma.AuditLogWhereInput = {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
      ...(actionTypes && actionTypes.length > 0 ? { action: { in: actionTypes } } : {}),
      ...(employeeId ? { employeeId } : {}),
    };

    const total = await this.prisma.auditLog.count({ where });
    if (total > AUDIT_ROW_CAP) {
      throw new BadRequestException(
        `Export would contain ${total} records (max ${AUDIT_ROW_CAP}). Narrow the date range or filters.`,
      );
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: AUDIT_ROW_CAP,
    });

    // Fetch employee and outlet names for the logs that have them
    const employeeIds = [...new Set(logs.map((l) => l.employeeId).filter(Boolean))] as string[];
    const outletIds = [...new Set(logs.map((l) => l.outletId).filter(Boolean))] as string[];

    const employeeMap = new Map<string, string>();
    const outletMap = new Map<string, string>();

    if (employeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: employeeIds }, businessId },
        select: { id: true, name: true },
      });
      for (const emp of employees) {
        employeeMap.set(emp.id, emp.name);
      }
    }

    if (outletIds.length > 0) {
      const outlets = await this.prisma.outlet.findMany({
        where: { id: { in: outletIds }, businessId },
        select: { id: true, name: true },
      });
      for (const outlet of outlets) {
        outletMap.set(outlet.id, outlet.name);
      }
    }

    let data: string;

    if (format === ExportFormat.CSV) {
      const header = [
        'timestamp',
        'action',
        'entity_type',
        'entity_id',
        'employee_id',
        'employee_name',
        'outlet_id',
        'outlet_name',
        'old_value',
        'new_value',
        'ip_address',
        'device_id',
      ].join(',');

      const rows = logs.map((log) => {
        const empName = log.employeeId ? (employeeMap.get(log.employeeId) ?? '') : '';
        const outletName = log.outletId ? (outletMap.get(log.outletId) ?? '') : '';

        return [
          log.createdAt.toISOString(),
          log.action,
          log.entityType,
          log.entityId ?? '',
          log.employeeId ?? '',
          empName,
          log.outletId ?? '',
          outletName,
          JSON.stringify(log.oldValue ?? {}),
          JSON.stringify(log.newValue ?? {}),
          log.ipAddress ?? '',
          log.deviceId ?? '',
        ]
          .map((cell) => csvEscape(cell))
          .join(',');
      });

      data = [header, ...rows].join('\n');
    } else {
      // JSON format
      const entries = logs.map((log) => ({
        timestamp: log.createdAt.toISOString(),
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        employeeId: log.employeeId,
        employeeName: log.employeeId ? (employeeMap.get(log.employeeId) ?? null) : null,
        outletId: log.outletId,
        outletName: log.outletId ? (outletMap.get(log.outletId) ?? null) : null,
        oldValue: log.oldValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        deviceId: log.deviceId,
      }));

      data = JSON.stringify(entries, null, 2);
    }

    this.logger.log(`Compliance export generated: ${logs.length} records as ${format}`);

    return {
      format,
      recordCount: logs.length,
      data,
      generatedAt: new Date(),
    };
  }

  // ========================================================================
  // AUDIT SUMMARY
  // ========================================================================

  /**
   * Get a high-level summary of audit logs for the business.
   */
  async getAuditSummary(businessId: string, startDate: Date, endDate: Date): Promise<AuditSummary> {
    const where = {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
    };

    // Total count
    const totalLogs = await this.prisma.auditLog.count({ where });

    // Group by action
    const actionGroups = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { id: true },
    });

    const byAction: Record<string, number> = {};
    for (const group of actionGroups) {
      byAction[group.action] = group._count.id;
    }

    // Group by entity type
    const entityGroups = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { id: true },
    });

    const byEntityType: Record<string, number> = {};
    for (const group of entityGroups) {
      byEntityType[group.entityType] = group._count.id;
    }

    // Group by employee
    const employeeGroups = await this.prisma.auditLog.groupBy({
      by: ['employeeId'],
      where: { ...where, employeeId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const byEmployee = employeeGroups.map((g) => ({
      employeeId: g.employeeId as string,
      count: g._count.id,
    }));

    // Count suspicious activities (quick estimate based on sensitive actions)
    const suspiciousActions = [...VOID_ACTIONS, ...REFUND_ACTIONS];

    const suspiciousCount = await this.prisma.auditLog.count({
      where: { ...where, action: { in: suspiciousActions } },
    });

    return {
      totalLogs,
      byAction,
      byEntityType,
      byEmployee,
      suspiciousCount,
      dateRange: { start: startDate, end: endDate },
    };
  }

  // ========================================================================
  // CONVENIENCE METHODS (simplified signatures)
  // ========================================================================

  /**
   * Detect suspicious activities with default date range (last 30 days).
   * Analyzes patterns: multiple voids, large discounts, after-hours, large refunds.
   */
  async detectSuspiciousActivity(businessId: string): Promise<SuspiciousActivityRecord[]> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.detectSuspiciousActivities(businessId, startDate, endDate);
  }

  /**
   * Export compliance report as CSV or JSON with optional filters.
   */
  async exportComplianceReport(
    businessId: string,
    startDate: Date,
    endDate: Date,
    format: ExportFormat,
    actionTypes?: string[],
    employeeId?: string,
  ): Promise<ComplianceExportResult> {
    return this.generateComplianceExport(
      businessId,
      startDate,
      endDate,
      format,
      actionTypes,
      employeeId,
    );
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  private groupByField<T extends { employeeId: string | null }>(
    logs: T[],
    field: 'employeeId',
  ): Record<string, T[]> {
    const map: Record<string, T[]> = {};
    for (const log of logs) {
      const key = (log[field] ?? 'unknown') as string;
      if (!map[key]) map[key] = [];
      map[key].push(log);
    }
    return map;
  }

  private groupByHour<T extends { createdAt: Date }>(logs: T[]): Record<string, T[]> {
    const map: Record<string, T[]> = {};
    for (const log of logs) {
      // Bucket by the business (WIB) hour: shift the instant by +7h and read UTC parts.
      const wib = new Date(log.createdAt.getTime() + 7 * 60 * 60 * 1000);
      const key = `${wib.toISOString().slice(0, 10)} ${String(businessHour(log.createdAt)).padStart(2, '0')}:00`;
      if (!map[key]) map[key] = [];
      map[key].push(log);
    }
    return map;
  }
}

/**
 * Escapes one CSV cell: quotes values containing separators/quotes/newlines and
 * neutralises spreadsheet formulas (cells starting with = + - @ tab or CR) by
 * prefixing a single quote (CSV/formula injection).
 */
export function csvEscape(raw: string): string {
  let value = raw;
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
