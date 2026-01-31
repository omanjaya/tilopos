export interface INotificationService {
  send(notification: NotificationPayload): Promise<void>;
  sendBulk(notifications: NotificationPayload[]): Promise<void>;
}

export interface NotificationPayload {
  recipientId: string;
  channel: 'push' | 'email' | 'sms' | 'whatsapp';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}
