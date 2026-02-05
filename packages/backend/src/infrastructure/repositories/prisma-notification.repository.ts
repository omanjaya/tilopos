import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  INotificationRepository,
  NotificationSettingRecord,
  NotificationLogRecord,
} from '../../domain/interfaces/repositories/notification.repository';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSettingsByBusinessId(businessId: string): Promise<NotificationSettingRecord[]> {
    return this.prisma.notificationSetting.findMany({
      where: { businessId },
    });
  }

  async createSetting(data: {
    businessId: string;
    outletId: string | null;
    employeeId: string;
    notificationType: string;
    channel: string;
    isEnabled: boolean;
    threshold: unknown;
  }): Promise<NotificationSettingRecord> {
    return this.prisma.notificationSetting.create({
      data: {
        businessId: data.businessId,
        outletId: data.outletId,
        employeeId: data.employeeId,
        notificationType: data.notificationType as
          | 'low_stock'
          | 'large_transaction'
          | 'refund'
          | 'online_order'
          | 'shift_reminder'
          | 'system_error',
        channel: data.channel as 'push' | 'email' | 'sms' | 'whatsapp',
        isEnabled: data.isEnabled,
        threshold: (data.threshold as never) || {},
      },
    });
  }

  async updateSetting(
    id: string,
    data: { isEnabled?: boolean; threshold?: unknown },
  ): Promise<NotificationSettingRecord> {
    return this.prisma.notificationSetting.update({
      where: { id },
      data: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.threshold !== undefined && {
          threshold: data.threshold as never,
        }),
      },
    });
  }

  async findLogsByRecipientId(
    recipientId: string,
    limit: number,
  ): Promise<NotificationLogRecord[]> {
    return this.prisma.notificationLog.findMany({
      where: { recipientId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  async markLogAsRead(id: string): Promise<NotificationLogRecord> {
    return this.prisma.notificationLog.update({
      where: { id },
      data: { status: 'read', readAt: new Date() },
    });
  }
}
