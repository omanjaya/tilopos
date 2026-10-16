import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';
import { addBusinessDays, BUSINESS_TZ, startOfBusinessDay } from '@shared/utils/business-time';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionService } from './subscription.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

/** Days before endDate on which an expiry reminder is sent (once per day offset). */
export const REMINDER_DAYS_BEFORE = [3, 1] as const;

/**
 * [start, end) of the business day that is `daysAhead` days after `now` (WIB).
 * A subscription gets a reminder only on the days where its endDate falls in
 * that window, so each offset fires exactly once — no daily duplicates.
 */
export function reminderWindow(now: Date, daysAhead: number): { gte: Date; lt: Date } {
  const start = startOfBusinessDay(addBusinessDays(now, daysAhead));
  return { gte: start, lt: addBusinessDays(start, 1) };
}

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationsService: NotificationsService,
    private readonly locks: DistributedLockService,
  ) {}

  /**
   * Run daily at 00:00 WIB — expire subscriptions past their end date
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: BUSINESS_TZ })
  async expireSubscriptions() {
    await this.locks.runExclusive('cron:subscription:expire', 600, async () => {
      this.logger.log('Running subscription expiration check...');
      try {
        const expired = await this.subscriptionService.checkAndExpireSubscriptions();
        if (expired > 0) {
          this.logger.log(`Expired ${expired} subscriptions`);
        }
      } catch (error) {
        this.logger.error('Failed to expire subscriptions', error);
      }
    });
  }

  /**
   * Run daily at 09:00 WIB — remind owners 3 days and 1 day before Premium ends.
   */
  @Cron('0 9 * * *', { timeZone: BUSINESS_TZ })
  async sendExpiryReminders() {
    await this.locks.runExclusive('cron:subscription:reminders', 1800, async () => {
      this.logger.log('Running subscription expiry reminder check...');
      try {
        await this.sendReminders(new Date());
      } catch (error) {
        this.logger.error('Failed to send expiry reminders', error);
      }
    });
  }

  async sendReminders(now: Date): Promise<number> {
    let sent = 0;
    for (const daysLeft of REMINDER_DAYS_BEFORE) {
      const expiring = await this.prisma.subscription.findMany({
        where: {
          status: { in: ['active', 'trial'] },
          endDate: reminderWindow(now, daysLeft),
        },
        select: { id: true, businessId: true, status: true },
      });
      if (expiring.length === 0) continue;

      // Batch-load all owners in a single query to avoid N+1
      const businessIds = [...new Set(expiring.map((sub) => sub.businessId))];
      const owners = await this.prisma.employee.findMany({
        where: { businessId: { in: businessIds }, role: 'owner', isActive: true },
        select: { id: true, outletId: true, businessId: true },
      });
      const ownerByBusinessId = new Map(owners.map((owner) => [owner.businessId, owner]));

      for (const sub of expiring) {
        const owner = ownerByBusinessId.get(sub.businessId);
        if (!owner) continue;

        const isTrial = sub.status === 'trial';
        const title = isTrial
          ? `Trial Premium berakhir dalam ${daysLeft} hari`
          : `Langganan Premium berakhir dalam ${daysLeft} hari`;
        const body = isTrial
          ? 'Upgrade sekarang untuk tetap menikmati semua fitur Premium.'
          : 'Perpanjang langganan untuk tetap menikmati semua fitur Premium.';

        try {
          // E-mail: push has no device-token registry and always reports NOT_CONFIGURED.
          const result = await this.notificationsService.send(
            sub.businessId,
            owner.outletId ?? '',
            {
              type: NotificationType.subscription_trial_expiring,
              channel: NotificationChannel.email,
              recipientId: owner.id,
              recipientType: 'employee',
              title,
              body,
              data: { daysLeft, subscriptionId: sub.id },
            },
          );
          if (result.success) sent++;
        } catch (error) {
          this.logger.warn(
            `Expiry reminder for subscription ${sub.id} failed: ${(error as Error).message}`,
          );
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} expiry reminders`);
    }
    return sent;
  }

  /**
   * Run daily at 10:00 WIB — expire pending invoices past due date
   */
  @Cron('0 10 * * *', { timeZone: BUSINESS_TZ })
  async expirePendingInvoices() {
    await this.locks.runExclusive('cron:subscription:expire-invoices', 600, async () => {
      this.logger.log('Running pending invoice expiration check...');
      try {
        const result = await this.prisma.invoice.updateMany({
          where: {
            status: 'pending',
            dueDate: { lt: new Date() },
          },
          data: { status: 'expired' },
        });

        if (result.count > 0) {
          this.logger.log(`Expired ${result.count} pending invoices`);
        }
      } catch (error) {
        this.logger.error('Failed to expire pending invoices', error);
      }
    });
  }
}
