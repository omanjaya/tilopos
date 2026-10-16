import { apiClient } from '../client';

/** GET /audit item (prisma-audit.repository.ts AuditLogRecord). */
export interface AuditLogRecord {
  id: string;
  businessId: string;
  outletId: string | null;
  employeeId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  deviceId: string | null;
  metadata: unknown;
  createdAt: string;
}

/** Backend max page size for GET /audit and GET /audit/entity. */
export const AUDIT_PAGE_SIZE = 100;

export interface AuditListParams {
  page?: number;
  limit?: number;
  /** YYYY-MM-DD (WIB business day); range max 366 days. */
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  /**
   * GET /audit?page&limit(<=100)&startDate&endDate — returns ONE page as a plain
   * array, newest first. Without dates the backend returns the last 30 days.
   */
  list: (params: AuditListParams = {}) =>
    apiClient
      .get<AuditLogRecord[]>('/audit', {
        params: { page: params.page ?? 1, limit: params.limit ?? AUDIT_PAGE_SIZE, startDate: params.startDate, endDate: params.endDate },
      })
      .then((r) => r.data),
};
