import { Injectable, Logger } from '@nestjs/common';

export interface PushNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(notification: PushNotification): Promise<boolean> {
    this.logger.log(`[Mock Push] Token: ${notification.token} | Title: ${notification.title}`);
    return true;
  }

  async sendMultiple(notifications: PushNotification[]): Promise<void> {
    for (const n of notifications) {
      await this.send(n);
    }
  }
}
