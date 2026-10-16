import { Injectable, Logger } from '@nestjs/common';
import type { INotificationService, NotificationPayload } from '@domain/interfaces/services';
import { NotificationType, type Prisma } from '@prisma/client';
import { EmailService } from './email/email.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { PushService } from './push/push.service';
import { PrismaService } from '../database/prisma.service';
import { escapeHtml, type DeliveryResult } from './notification-utils';

const NOTIFICATION_TYPES = new Set<string>(Object.values(NotificationType));
const CONTACT_KEYS = new Set(['email', 'phone', 'pushToken']);

/**
 * INotificationService used by domain event listeners (SERVICE_TOKENS.NOTIFICATION).
 *
 * Every dispatch records the real per-channel outcome in notification_logs
 * (status 'sent' only when the provider accepted the message) — unconfigured
 * providers are reported as failed with reason NOT_CONFIGURED (R10).
 * Unexpected errors are logged and rethrown so callers can retry (R11).
 */
@Injectable()
export class NotificationDispatcherService implements INotificationService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly pushService: PushService,
    private readonly prisma: PrismaService,
  ) {}

  async send(notification: NotificationPayload): Promise<void> {
    await this.dispatch(notification);
  }

  /** Same as send() but returns the delivery outcome. */
  async dispatch(notification: NotificationPayload): Promise<DeliveryResult> {
    let result: DeliveryResult;
    let unexpected: unknown = null;
    try {
      result = await this.deliver(notification);
    } catch (error) {
      unexpected = error;
      result = {
        success: false,
        reason: 'PROVIDER_ERROR',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (!result.success) {
      this.logger.warn(
        `${notification.channel} notification "${notification.title}" not delivered: ${result.reason}`,
      );
    }

    await this.writeLog(notification, result);

    if (unexpected) {
      this.logger.error(`Failed to dispatch ${notification.channel} notification`, unexpected);
      throw unexpected;
    }
    return result;
  }

  async sendBulk(notifications: NotificationPayload[]): Promise<void> {
    const results = await Promise.allSettled(notifications.map((n) => this.dispatch(n)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.error(`sendBulk: ${failed}/${notifications.length} notifications failed`);
    }
  }

  private async deliver(notification: NotificationPayload): Promise<DeliveryResult> {
    const meta = notification.metadata ?? {};
    switch (notification.channel) {
      case 'email': {
        const email = typeof meta.email === 'string' ? meta.email : null;
        if (!email) return { success: false, reason: 'NO_RECIPIENT' };
        if (!this.emailService.isConfigured()) return { success: false, reason: 'NOT_CONFIGURED' };
        await this.emailService.send({
          to: email,
          subject: notification.title,
          html: `<h2>${escapeHtml(notification.title)}</h2><p>${escapeHtml(notification.body)}</p>`,
        });
        return { success: true };
      }
      case 'whatsapp': {
        const phone = typeof meta.phone === 'string' ? meta.phone : null;
        if (!phone) return { success: false, reason: 'NO_RECIPIENT' };
        return this.whatsAppService.send({
          to: phone,
          message: `*${notification.title}*\n${notification.body}`,
        });
      }
      case 'push': {
        const token = typeof meta.pushToken === 'string' ? meta.pushToken : null;
        if (!this.pushService.isConfigured()) return { success: false, reason: 'NOT_CONFIGURED' };
        if (!token) return { success: false, reason: 'NO_RECIPIENT' };
        return this.pushService.send({
          token,
          title: notification.title,
          body: notification.body,
        });
      }
      case 'sms':
        // No SMS provider is wired into this dispatcher.
        return { success: false, reason: 'NOT_CONFIGURED' };
      default:
        return { success: false, reason: 'UNSUPPORTED' };
    }
  }

  private async writeLog(notification: NotificationPayload, result: DeliveryResult): Promise<void> {
    const meta = notification.metadata ?? {};
    const businessId = typeof meta.businessId === 'string' ? meta.businessId : null;
    if (!businessId) {
      this.logger.warn(
        `Notification "${notification.title}" not logged: metadata.businessId missing`,
      );
      return;
    }
    const rawType = meta.notificationType ?? meta.type;
    if (typeof rawType !== 'string' || !NOTIFICATION_TYPES.has(rawType)) {
      this.logger.warn(
        `Notification "${notification.title}" not logged: metadata.notificationType missing/invalid`,
      );
      return;
    }

    // Don't persist contact details (email/phone/token) into the log metadata.
    const safeMeta = Object.fromEntries(
      Object.entries(meta).filter(([key]) => !CONTACT_KEYS.has(key)),
    );

    await this.prisma.notificationLog.create({
      data: {
        businessId,
        outletId: typeof meta.outletId === 'string' ? meta.outletId : null,
        recipientId: notification.recipientId || null,
        notificationType: rawType as NotificationType,
        channel: notification.channel,
        title: notification.title,
        body: notification.body,
        status: result.success ? 'sent' : 'failed',
        metadata: {
          ...safeMeta,
          delivery: {
            success: result.success,
            reason: result.reason ?? null,
            error: result.error ?? null,
          },
        } as Prisma.InputJsonValue,
      },
    });
  }
}
