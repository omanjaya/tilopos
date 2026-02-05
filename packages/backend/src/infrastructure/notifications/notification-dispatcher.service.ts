import { Injectable, Logger } from '@nestjs/common';
import type { INotificationService, NotificationPayload } from '@domain/interfaces/services';
import { EmailService } from './email/email.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { PushService } from './push/push.service';
import { PrismaService } from '../database/prisma.service';

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
    try {
      switch (notification.channel) {
        case 'email': {
          const email = notification.metadata?.email as string;
          if (email) {
            await this.emailService.send({
              to: email,
              subject: notification.title,
              html: `<h2>${notification.title}</h2><p>${notification.body}</p>`,
            });
          }
          break;
        }
        case 'whatsapp': {
          const phone = notification.metadata?.phone as string;
          if (phone) {
            await this.whatsAppService.send({
              to: phone,
              message: `*${notification.title}*\n${notification.body}`,
            });
          }
          break;
        }
        case 'push': {
          const token = notification.metadata?.pushToken as string;
          if (token) {
            await this.pushService.send({
              token,
              title: notification.title,
              body: notification.body,
              data: notification.metadata as Record<string, string> | undefined,
            });
          }
          break;
        }
        case 'sms':
          this.logger.log(
            `[SMS] To: ${notification.recipientId} | ${notification.title}: ${notification.body}`,
          );
          break;
      }

      if (notification.metadata?.businessId) {
        await this.prisma.notificationLog.create({
          data: {
            businessId: notification.metadata.businessId as string,
            outletId: (notification.metadata.outletId as string) || null,
            recipientId: notification.recipientId || null,
            notificationType:
              (notification.metadata.notificationType as
                | 'low_stock'
                | 'large_transaction'
                | 'refund'
                | 'online_order'
                | 'shift_reminder'
                | 'system_error') || 'system_error',
            channel: notification.channel,
            title: notification.title,
            body: notification.body,
            metadata: (notification.metadata || {}) as Record<string, unknown>,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to dispatch ${notification.channel} notification`, error);
    }
  }

  async sendBulk(notifications: NotificationPayload[]): Promise<void> {
    await Promise.allSettled(notifications.map((n) => this.send(n)));
  }
}
