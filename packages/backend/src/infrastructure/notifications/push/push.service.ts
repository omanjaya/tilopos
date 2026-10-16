import { Injectable, Logger } from '@nestjs/common';
import type { DeliveryResult } from '../notification-utils';

export interface PushNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Push delivery is not implemented: there is no FCM HTTP v1 integration and no
 * device-token registry. Every send reports NOT_CONFIGURED instead of pretending
 * the message was delivered (Docs/ENGINEERING-RULES.md R10).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  isConfigured(): boolean {
    return false;
  }

  async send(notification: PushNotification): Promise<DeliveryResult> {
    this.logger.warn(`Push not delivered (provider not configured): "${notification.title}"`);
    return { success: false, reason: 'NOT_CONFIGURED' };
  }

  async sendMultiple(notifications: PushNotification[]): Promise<DeliveryResult[]> {
    return Promise.all(notifications.map((n) => this.send(n)));
  }
}
