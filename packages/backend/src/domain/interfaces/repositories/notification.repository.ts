export interface NotificationSettingRecord {
  id: string;
  businessId: string;
  outletId: string | null;
  employeeId: string | null;
  notificationType: string;
  channel: string;
  isEnabled: boolean;
  threshold: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLogRecord {
  id: string;
  businessId: string;
  outletId: string | null;
  recipientId: string | null;
  notificationType: string;
  channel: string;
  title: string;
  body: string | null;
  status: string;
  metadata: unknown;
  sentAt: Date;
  readAt: Date | null;
}

/** Tenant-scoped (R3): every read/update is filtered by businessId (and recipient where relevant). */
export interface INotificationRepository {
  findSettingsByBusinessId(
    businessId: string,
    employeeId?: string,
  ): Promise<NotificationSettingRecord[]>;
  createSetting(data: {
    businessId: string;
    outletId: string | null;
    employeeId: string;
    notificationType: string;
    channel: string;
    isEnabled: boolean;
    threshold: unknown;
  }): Promise<NotificationSettingRecord>;
  updateSetting(
    id: string,
    data: { isEnabled?: boolean; threshold?: unknown },
    businessId: string,
  ): Promise<NotificationSettingRecord>;
  findLogsByRecipientId(
    recipientId: string,
    limit: number,
    businessId?: string,
    skip?: number,
  ): Promise<NotificationLogRecord[]>;
  markLogAsRead(
    id: string,
    recipientId: string,
    businessId: string,
  ): Promise<NotificationLogRecord>;
  markAllLogsAsRead(recipientId: string, businessId: string): Promise<{ count: number }>;
}
