import {
  SubscriptionScheduler,
  reminderWindow,
  REMINDER_DAYS_BEFORE,
} from '../subscription.scheduler';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { SubscriptionService } from '../subscription.service';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { DistributedLockService } from '@shared/locks/distributed-lock.service';

describe('SubscriptionScheduler', () => {
  // 2026-02-19 09:00 WIB
  const now = new Date('2026-02-19T02:00:00.000Z');

  it('reminder window is exactly one WIB business day, N days ahead', () => {
    const w = reminderWindow(now, 3);
    expect(w.gte.toISOString()).toBe('2026-02-21T17:00:00.000Z'); // 22 Feb 00:00 WIB
    expect(w.lt.toISOString()).toBe('2026-02-22T17:00:00.000Z');
  });

  it('consecutive runs never select the same endDate for the same offset (no daily duplicates)', () => {
    const endDate = new Date('2026-02-22T05:00:00.000Z'); // 22 Feb 12:00 WIB
    const hits = [0, 1, 2, 3].flatMap((day) => {
      const runAt = new Date(now.getTime() + day * 86_400_000);
      return REMINDER_DAYS_BEFORE.filter((d) => {
        const w = reminderWindow(runAt, d);
        return endDate >= w.gte && endDate < w.lt;
      }).map((d) => `${day}:${d}`);
    });
    expect(hits).toEqual(['0:3', '2:1']);
  });

  it('cron handlers run under the distributed lock', async () => {
    const locks = { runExclusive: jest.fn().mockResolvedValue(undefined) };
    const scheduler = new SubscriptionScheduler(
      {} as PrismaService,
      { checkAndExpireSubscriptions: jest.fn() } as unknown as SubscriptionService,
      {} as NotificationsService,
      locks as unknown as DistributedLockService,
    );
    await scheduler.expireSubscriptions();
    await scheduler.sendExpiryReminders();
    await scheduler.expirePendingInvoices();
    expect(locks.runExclusive.mock.calls.map((c) => c[0])).toEqual([
      'cron:subscription:expire',
      'cron:subscription:reminders',
      'cron:subscription:expire-invoices',
    ]);
  });
});
