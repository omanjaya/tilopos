import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaNotificationRepository } from './prisma-notification.repository';
import type { PrismaService } from '../database/prisma.service';

function makePrisma() {
  return {
    notificationSetting: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    notificationLog: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

describe('PrismaNotificationRepository (tenant scoping)', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaNotificationRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaNotificationRepository(prisma as unknown as PrismaService);
  });

  describe('updateSetting', () => {
    it('scopes the update by businessId and 404s for another business’ setting', async () => {
      prisma.notificationSetting.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repo.updateSetting('setting-of-biz-b', { isEnabled: false }, 'biz-a'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.notificationSetting.updateMany).toHaveBeenCalledWith({
        where: { id: 'setting-of-biz-b', businessId: 'biz-a' },
        data: { isEnabled: false },
      });
    });

    it('returns the updated setting when it belongs to the business', async () => {
      prisma.notificationSetting.updateMany.mockResolvedValue({ count: 1 });
      prisma.notificationSetting.findFirst.mockResolvedValue({ id: 's1', businessId: 'biz-a' });

      await expect(repo.updateSetting('s1', { isEnabled: true }, 'biz-a')).resolves.toEqual({
        id: 's1',
        businessId: 'biz-a',
      });
      expect(prisma.notificationSetting.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', businessId: 'biz-a' },
      });
    });

    it('refuses to run without a businessId', async () => {
      await expect(repo.updateSetting('s1', { isEnabled: true })).rejects.toThrow(
        /businessId is required/,
      );
      expect(prisma.notificationSetting.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('markLogAsRead', () => {
    it('only marks the caller’s own log in their business', async () => {
      prisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.markLogAsRead('log-1', 'emp-a', 'biz-a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-1', recipientId: 'emp-a', businessId: 'biz-a' },
        }),
      );
    });

    it('refuses to run without recipient scope', async () => {
      await expect(repo.markLogAsRead('log-1')).rejects.toThrow(/recipientId is required/);
      expect(prisma.notificationLog.updateMany).not.toHaveBeenCalled();
    });
  });

  it('markAllLogsAsRead is scoped to recipient and business', async () => {
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 3 });
    await expect(repo.markAllLogsAsRead('emp-a', 'biz-a')).resolves.toEqual({ count: 3 });
    expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientId: 'emp-a', businessId: 'biz-a', readAt: null },
      }),
    );
  });

  it('maps a duplicate setting to 409', async () => {
    prisma.notificationSetting.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(
      repo.createSetting({
        businessId: 'biz-a',
        outletId: null,
        employeeId: 'emp-a',
        notificationType: 'low_stock',
        channel: 'push',
        isEnabled: true,
        threshold: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
