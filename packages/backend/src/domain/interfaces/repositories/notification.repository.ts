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

export interface INotificationRepository {
  findSettingsByBusinessId(businessId: string): Promise<NotificationSettingRecord[]>;
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
  ): Promise<NotificationSettingRecord>;
  findLogsByRecipientId(recipientId: string, limit: number): Promise<NotificationLogRecord[]>;
  markLogAsRead(id: string): Promise<NotificationLogRecord>;
}
