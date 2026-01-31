export interface IAuditLogRepository {
  create(data: AuditLogRecord): Promise<AuditLogRecord>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLogRecord[]>;
  findByDateRange(businessId: string, start: Date, end: Date): Promise<AuditLogRecord[]>;
}

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
  createdAt: Date;
}
