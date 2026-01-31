import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  SuspiciousActivityType,
  ExportFormat,
  type SuspiciousActivityRecord,
  type AuditSummary,
  type ComplianceExportResult,
} from '../../application/dtos/audit.dto';

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
  /** Max cash drawer opens without a sale in 1 hour */
  maxCashDrawerOpensPerHour: 5,
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========================================================================
  // SUSPICIOUS ACTIVITY DETECTION
  // ========================================================================

  /**
   * Detect suspicious activities within the given date range.
   *
   * Patterns detected:
   * - Multiple voids in a short time
   * - Unusual discount amounts
   * - Cash drawer openings without sales
   * - After-hours transactions
   * - Large refunds
   */
  async detectSuspiciousActivities(
    businessId: string,
    startDate: Date,
    endDate: Date,
    types?: SuspiciousActivityType[],
    outletId?: string,
  ): Promise<SuspiciousActivityRecord[]> {
    const typesToCheck = types && types.length > 0
      ? types
      : Object.values(SuspiciousActivityType);

    const results: SuspiciousActivityRecord[] = [];

    const baseWhere = {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
      ...(outletId ? { outletId } : {}),
    };

    // ---- Multiple voids ----
    if (typesToCheck.includes(SuspiciousActivityType.MULTIPLE_VOIDS)) {
      const voidLogs = await this.prisma.auditLog.findMany({
        where: { ...baseWhere, action: { in: ['void_transaction', 'void', 'transaction_void'] } },
        orderBy: { createdAt: 'asc' },
      });

      const voidsByEmployee = this.groupByField(voidLogs, 'employeeId');

      for (const [empId, logs] of Object.entries(voidsByEmployee)) {
        const hourBuckets = this.groupByHour(logs);
        for (const [hourKey, bucket] of Object.entries(hourBuckets)) {
          if (bucket.length >= SUSPICIOUS_THRESHOLDS.maxVoidsPerHour) {
            results.push({
              type: SuspiciousActivityType.MULTIPLE_VOIDS,
              severity: bucket.length >= SUSPICIOUS_THRESHOLDS.maxVoidsPerHour * 2 ? 'high' : 'medium',
              description: `Employee performed ${bucket.length} voids within 1 hour (${hourKey})`,
              employeeId: empId || null,
              outletId: bucket[0]?.outletId ?? null,
              occurredAt: bucket[0]?.createdAt ?? new Date(),
              relatedEntityType: 'transaction',
              relatedEntityId: bucket[0]?.entityId ?? null,
              details: { count: bucket.length, hour: hourKey, threshold: SUSPICIOUS_THRESHOLDS.maxVoidsPerHour },
            });
          }
        }
      }
    }

    // ---- Unusual discounts ----
    if (typesToCheck.includes(SuspiciousActivityType.UNUSUAL_DISCOUNT)) {
      const discountLogs = await this.prisma.auditLog.findMany({
        where: { ...baseWhere, action: { in: ['apply_discount', 'discount', 'transaction_discount'] } },
        orderBy: { createdAt: 'desc' },
      });

      for (const log of discountLogs) {
        const newVal = log.newValue as Record<string, unknown> | null;
        const discountPct = Number(newVal?.discountPercentage ?? newVal?.discount_percentage ?? 0);

        if (discountPct >= SUSPICIOUS_THRESHOLDS.unusualDiscountPct) {
          results.push({
            type: SuspiciousActivityType.UNUSUAL_DISCOUNT,
            severity: discountPct >= 80 ? 'high' : 'medium',
            description: `Discount of ${discountPct}% applied (threshold: ${SUSPICIOUS_THRESHOLDS.unusualDiscountPct}%)`,
            employeeId: log.employeeId,
            outletId: log.outletId,
            occurredAt: log.createdAt,
            relatedEntityType: log.entityType,
            relatedEntityId: log.entityId,
            details: { discountPercentage: discountPct, threshold: SUSPICIOUS_THRESHOLDS.unusualDiscountPct },
          });
        }
      }
    }

    // ---- Cash drawer no sale ----
    if (typesToCheck.includes(SuspiciousActivityType.CASH_DRAWER_NO_SALE)) {
      const drawerLogs = await this.prisma.auditLog.findMany({
        where: { ...baseWhere, action: { in: ['open_cash_drawer', 'cash_drawer_open', 'no_sale_open'] } },
        orderBy: { createdAt: 'asc' },
      });

      const drawerByEmployee = this.groupByField(drawerLogs, 'employeeId');

      for (const [empId, logs] of Object.entries(drawerByEmployee)) {
        const hourBuckets = this.groupByHour(logs);
        for (const [hourKey, bucket] of Object.entries(hourBuckets)) {
          if (bucket.length >= SUSPICIOUS_THRESHOLDS.maxCashDrawerOpensPerHour) {
            results.push({
              type: SuspiciousActivityType.CASH_DRAWER_NO_SALE,
              severity: 'medium',
              description: `Cash drawer opened ${bucket.length} times without sale in 1 hour (${hourKey})`,
              employeeId: empId || null,
              outletId: bucket[0]?.outletId ?? null,
              occurredAt: bucket[0]?.createdAt ?? new Date(),
              relatedEntityType: 'cash_drawer',
              relatedEntityId: null,
              details: { count: bucket.length, hour: hourKey, threshold: SUSPICIOUS_THRESHOLDS.maxCashDrawerOpensPerHour },
            });
          }
        }
      }
    }

    // ---- After-hours transactions ----
    if (typesToCheck.includes(SuspiciousActivityType.AFTER_HOURS)) {
      const allLogs = await this.prisma.auditLog.findMany({
        where: {
          ...baseWhere,
          action: { in: ['create_transaction', 'transaction_create', 'void_transaction', 'refund'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const log of allLogs) {
        const hour = log.createdAt.getHours();
        if (hour < SUSPICIOUS_THRESHOLDS.businessHoursStart || hour >= SUSPICIOUS_THRESHOLDS.businessHoursEnd) {
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
        where: { ...baseWhere, action: { in: ['refund', 'refund_transaction', 'create_refund'] } },
        orderBy: { createdAt: 'desc' },
      });

      for (const log of refundLogs) {
        const newVal = log.newValue as Record<string, unknown> | null;
        const refundAmount = Number(newVal?.refundAmount ?? newVal?.amount ?? newVal?.total ?? 0);

        if (refundAmount >= SUSPICIOUS_THRESHOLDS.largeRefundAmount) {
          results.push({
            type: SuspiciousActivityType.LARGE_REFUND,
            severity: refundAmount >= SUSPICIOUS_THRESHOLDS.largeRefundAmount * 2 ? 'high' : 'medium',
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
    const where: Record<string, unknown> = {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (actionTypes && actionTypes.length > 0) {
      where['action'] = { in: actionTypes };
    }

    if (employeeId) {
      where['employeeId'] = employeeId;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Fetch employee and outlet names for the logs that have them
    const employeeIds = [...new Set(logs.map((l) => l.employeeId).filter(Boolean))] as string[];
    const outletIds = [...new Set(logs.map((l) => l.outletId).filter(Boolean))] as string[];

    const employeeMap = new Map<string, string>();
    const outletMap = new Map<string, string>();

    if (employeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true },
      });
      for (const emp of employees) {
        employeeMap.set(emp.id, emp.name);
      }
    }

    if (outletIds.length > 0) {
      const outlets = await this.prisma.outlet.findMany({
        where: { id: { in: outletIds } },
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
        const empName = log.employeeId ? employeeMap.get(log.employeeId) ?? '' : '';
        const outletName = log.outletId ? outletMap.get(log.outletId) ?? '' : '';

        return [
          log.createdAt.toISOString(),
          this.csvEscape(log.action),
          this.csvEscape(log.entityType),
          log.entityId ?? '',
          log.employeeId ?? '',
          this.csvEscape(empName),
          log.outletId ?? '',
          this.csvEscape(outletName),
          this.csvEscape(JSON.stringify(log.oldValue ?? {})),
          this.csvEscape(JSON.stringify(log.newValue ?? {})),
          log.ipAddress ?? '',
          log.deviceId ?? '',
        ].join(',');
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
        employeeName: log.employeeId ? employeeMap.get(log.employeeId) ?? null : null,
        outletId: log.outletId,
        outletName: log.outletId ? outletMap.get(log.outletId) ?? null : null,
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
  async getAuditSummary(
    businessId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AuditSummary> {
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
    const suspiciousActions = [
      'void_transaction', 'void', 'transaction_void',
      'refund', 'refund_transaction', 'create_refund',
      'open_cash_drawer', 'cash_drawer_open', 'no_sale_open',
    ];

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
   * Analyzes patterns: multiple voids, large discounts, after-hours, cash drawer abuse, large refunds.
   */
  async detectSuspiciousActivity(
    businessId: string,
  ): Promise<SuspiciousActivityRecord[]> {
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

  private groupByHour<T extends { createdAt: Date }>(
    logs: T[],
  ): Record<string, T[]> {
    const map: Record<string, T[]> = {};
    for (const log of logs) {
      const d = log.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
      if (!map[key]) map[key] = [];
      map[key].push(log);
    }
    return map;
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
