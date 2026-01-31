export interface INotificationRepository {
  findSettingsByBusinessId(businessId: string): Promise<any[]>;
  createSetting(data: {
    businessId: string;
    outletId: string | null;
    employeeId: string;
    notificationType: string;
    channel: string;
    isEnabled: boolean;
    threshold: unknown;
  }): Promise<any>;
  updateSetting(id: string, data: { isEnabled?: boolean; threshold?: unknown }): Promise<any>;
  findLogsByRecipientId(recipientId: string, limit: number): Promise<any[]>;
  markLogAsRead(id: string): Promise<any>;
}
