import type { ConfigService } from '@nestjs/config';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailService } from './email/email.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { PushService } from './push/push.service';
import type { PrismaService } from '../database/prisma.service';
import { escapeHtml, maskPhone } from './notification-utils';

const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

function setup() {
  const prisma = { notificationLog: { create: jest.fn().mockResolvedValue({}) } };
  const email = new EmailService(emptyConfig);
  const dispatcher = new NotificationDispatcherService(
    email,
    new WhatsAppService(emptyConfig),
    new PushService(),
    prisma as unknown as PrismaService,
  );
  return { prisma, email, dispatcher };
}

describe('NotificationDispatcherService', () => {
  it.each([
    ['push', { pushToken: 'tok' }],
    ['whatsapp', { phone: '081234567' }],
    ['email', { email: 'a@b.co' }],
    ['sms', {}],
  ] as const)('%s without provider -> NOT_CONFIGURED and failed log', async (channel, contact) => {
    const { prisma, dispatcher } = setup();

    const result = await dispatcher.dispatch({
      recipientId: 'emp-1',
      channel,
      title: 'Low Stock Alert',
      body: 'x',
      metadata: { businessId: 'biz-1', type: 'low_stock', ...contact },
    });

    expect(result).toEqual({ success: false, reason: 'NOT_CONFIGURED' });
    const data = prisma.notificationLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: 'failed', notificationType: 'low_stock' });
    // contact details are not persisted in the log
    expect(data.metadata).not.toHaveProperty('phone');
    expect(data.metadata).not.toHaveProperty('email');
    expect(data.metadata).not.toHaveProperty('pushToken');
  });

  it('does not mislabel logs without a notification type', async () => {
    const { prisma, dispatcher } = setup();
    await dispatcher.send({
      recipientId: 'emp-1',
      channel: 'sms',
      title: 't',
      body: 'b',
      metadata: { businessId: 'biz-1' },
    });
    expect(prisma.notificationLog.create).not.toHaveBeenCalled();
  });

  it('EmailService.send throws when SMTP is not configured', async () => {
    const { email } = setup();
    await expect(email.send({ to: 'a@b.co', subject: 's', html: 'x' })).rejects.toThrow(
      /not configured/,
    );
  });

  it('escapes HTML and masks phone numbers', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    expect(maskPhone('+62 812-3456-7890')).toBe('***890');
  });
});
