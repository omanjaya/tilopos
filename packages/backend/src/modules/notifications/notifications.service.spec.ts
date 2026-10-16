import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  EmailChannel,
  NotificationsService,
  PushNotificationChannel,
  SMSChannel,
  WhatsAppChannel,
  type NotificationPayload,
} from './notifications.service';

const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

function makePrisma() {
  return {
    employee: { findFirst: jest.fn() },
    customer: { findFirst: jest.fn() },
    notificationLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new NotificationsService(
    prisma as unknown as PrismaService,
    new PushNotificationChannel(),
    new EmailChannel(emptyConfig),
    new SMSChannel(emptyConfig),
    new WhatsAppChannel(emptyConfig),
  );
}

const payload = (channel: NotificationPayload['channel']): NotificationPayload => ({
  type: 'low_stock',
  channel,
  recipientId: 'emp-1',
  recipientType: 'employee',
  title: 'Low stock',
  body: 'Kopi tinggal 2',
});

describe('NotificationsService (no fake success)', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchSpy.mockRestore());

  it.each(['whatsapp', 'sms', 'email'] as const)(
    '%s without provider config -> success:false NOT_CONFIGURED and log status failed',
    async (channel) => {
      const prisma = makePrisma();
      prisma.employee.findFirst.mockResolvedValue({ email: 'a@b.co', phone: '0812' });
      const service = makeService(prisma);

      const result = await service.send('biz-1', 'outlet-1', payload(channel));

      expect(result).toEqual({ success: false, logId: 'log-1', error: 'NOT_CONFIGURED' });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'failed', businessId: 'biz-1' }),
      });
    },
  );

  it('push is reported as NOT_CONFIGURED, never as sent', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    const result = await service.send('biz-1', 'outlet-1', payload('push'));

    expect(result.success).toBe(false);
    expect(prisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'failed' }),
    });
  });

  it('looks up the recipient inside the business and logs a failure when missing', async () => {
    const prisma = makePrisma();
    prisma.employee.findFirst.mockResolvedValue(null);
    const service = makeService(prisma);

    const result = await service.send('biz-1', 'outlet-1', payload('whatsapp'));

    expect(prisma.employee.findFirst).toHaveBeenCalledWith({
      where: { id: 'emp-1', businessId: 'biz-1' },
      select: { email: true, phone: true },
    });
    expect(result).toEqual({ success: false, logId: 'log-1', error: 'NO_CONTACT' });
    expect(prisma.notificationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'failed' }),
    });
  });
});
