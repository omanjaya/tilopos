import { Injectable, Logger } from '@nestjs/common';
import type { INotificationService, NotificationPayload } from '@domain/interfaces/services';

@Injectable()
export class MockNotificationService implements INotificationService {
  private readonly logger = new Logger(MockNotificationService.name);

  async send(notification: NotificationPayload): Promise<void> {
    this.logger.log(
      `[Mock] Sending ${notification.channel} notification to ${notification.recipientId}: "${notification.title}"`,
    );
  }

  async sendBulk(notifications: NotificationPayload[]): Promise<void> {
    for (const notification of notifications) {
      await this.send(notification);
    }
  }
}
