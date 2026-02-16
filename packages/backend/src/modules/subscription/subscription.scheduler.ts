import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionService } from './subscription.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Run daily at midnight — expire subscriptions past their end date
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireSubscriptions() {
    this.logger.log('Running subscription expiration check...');
    try {
      const expired = await this.subscriptionService.checkAndExpireSubscriptions();
      if (expired > 0) {
        this.logger.log(`Expired ${expired} subscriptions`);
      }
    } catch (error) {
      this.logger.error('Failed to expire subscriptions', error);
    }
  }

  /**
   * Run daily at 9 AM — send reminders for subscriptions expiring in 3 days
   */
  @Cron('0 9 * * *')
  async sendExpiryReminders() {
    this.logger.log('Running subscription expiry reminder check...');
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find subscriptions expiring within 3 days
      const expiring = await this.prisma.subscription.findMany({
        where: {
          status: { in: ['active', 'trial'] },
          endDate: {
            gt: now,
            lte: threeDaysFromNow,
          },
        },
        include: {
          business: {
            select: { id: true, name: true },
          },
        },
      });

      for (const sub of expiring) {
        const daysLeft = Math.ceil(
          (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        const isTrial = sub.status === 'trial';
        const title = isTrial
          ? `Trial Premium berakhir dalam ${daysLeft} hari`
          : `Langganan Premium berakhir dalam ${daysLeft} hari`;
        const body = isTrial
          ? 'Upgrade sekarang untuk tetap menikmati semua fitur Premium.'
          : 'Perpanjang langganan untuk tetap menikmati semua fitur Premium.';

        // Find owner employee and their outlet to notify
        const owner = await this.prisma.employee.findFirst({
          where: { businessId: sub.businessId, role: 'owner' },
          select: { id: true, outletId: true },
        });

        if (owner) {
          await this.notificationsService.send(sub.businessId, owner.outletId ?? '', {
            type: NotificationType.subscription_trial_expiring,
            channel: NotificationChannel.push,
            recipientId: owner.id,
            recipientType: 'employee',
            title,
            body,
            data: { daysLeft, subscriptionId: sub.id },
          });
        }
      }

      if (expiring.length > 0) {
        this.logger.log(`Sent ${expiring.length} expiry reminders`);
      }
    } catch (error) {
      this.logger.error('Failed to send expiry reminders', error);
    }
  }

  /**
   * Run daily at 10 AM — expire pending invoices past due date
   */
  @Cron('0 10 * * *')
  async expirePendingInvoices() {
    this.logger.log('Running pending invoice expiration check...');
    try {
      const now = new Date();

      const result = await this.prisma.invoice.updateMany({
        where: {
          status: 'pending',
          dueDate: { lt: now },
        },
        data: { status: 'expired' },
      });

      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} pending invoices`);
      }
    } catch (error) {
      this.logger.error('Failed to expire pending invoices', error);
    }
  }
}
