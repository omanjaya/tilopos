import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  INotificationRepository,
  NotificationSettingRecord,
  NotificationLogRecord,
} from '../../domain/interfaces/repositories/notification.repository';

/**
 * Tenant-scoped operations. The domain interface still declares the old
 * unscoped signatures, so the scope arguments are optional in TypeScript but
 * REQUIRED at runtime: calls without them throw instead of touching another
 * tenant's rows (R3).
 */
export interface ScopedNotificationRepository extends INotificationRepository {
  findSettingsByBusinessId(
    businessId: string,
    employeeId?: string,
  ): Promise<NotificationSettingRecord[]>;
  updateSetting(
    id: string,
    data: { isEnabled?: boolean; threshold?: unknown },
    businessId?: string,
  ): Promise<NotificationSettingRecord>;
  findLogsByRecipientId(
    recipientId: string,
    limit: number,
    businessId?: string,
    skip?: number,
  ): Promise<NotificationLogRecord[]>;
  markLogAsRead(
    id: string,
    recipientId?: string,
    businessId?: string,
  ): Promise<NotificationLogRecord>;
  markAllLogsAsRead(recipientId: string, businessId: string): Promise<{ count: number }>;
}

function requireScope(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`PrismaNotificationRepository: ${name} is required`);
  }
  return value;
}

@Injectable()
export class PrismaNotificationRepository implements ScopedNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSettingsByBusinessId(
    businessId: string,
    employeeId?: string,
  ): Promise<NotificationSettingRecord[]> {
    return this.prisma.notificationSetting.findMany({
      where: {
        businessId: requireScope(businessId, 'businessId'),
        ...(employeeId && { employeeId }),
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
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
    try {
      return await this.prisma.notificationSetting.create({
        data: {
          businessId: requireScope(data.businessId, 'businessId'),
          outletId: data.outletId,
          employeeId: data.employeeId,
          notificationType: data.notificationType as NotificationType,
          channel: data.channel as NotificationChannel,
          isEnabled: data.isEnabled,
          threshold: (data.threshold ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'A notification setting for this type and channel already exists',
        );
      }
      throw error;
    }
  }

  async updateSetting(
    id: string,
    data: { isEnabled?: boolean; threshold?: unknown },
    businessId?: string,
  ): Promise<NotificationSettingRecord> {
    const scope = { id, businessId: requireScope(businessId, 'businessId') };
    const { count } = await this.prisma.notificationSetting.updateMany({
      where: scope,
      data: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.threshold !== undefined && {
          threshold: data.threshold as Prisma.InputJsonValue,
        }),
      },
    });
    if (count === 0) {
      throw new NotFoundException('Notification setting not found');
    }
    const updated = await this.prisma.notificationSetting.findFirst({ where: scope });
    if (!updated) {
      throw new NotFoundException('Notification setting not found');
    }
    return updated;
  }

  async findLogsByRecipientId(
    recipientId: string,
    limit: number,
    businessId?: string,
    skip = 0,
  ): Promise<NotificationLogRecord[]> {
    return this.prisma.notificationLog.findMany({
      where: {
        recipientId: requireScope(recipientId, 'recipientId'),
        ...(businessId && { businessId }),
      },
      orderBy: { sentAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      skip,
    });
  }

  async markLogAsRead(
    id: string,
    recipientId?: string,
    businessId?: string,
  ): Promise<NotificationLogRecord> {
    const scope = {
      id,
      recipientId: requireScope(recipientId, 'recipientId'),
      businessId: requireScope(businessId, 'businessId'),
    };
    const { count } = await this.prisma.notificationLog.updateMany({
      where: scope,
      data: { status: 'read', readAt: new Date() },
    });
    if (count === 0) {
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notificationLog.findFirst({ where: scope });
    if (!updated) {
      throw new NotFoundException('Notification not found');
    }
    return updated;
  }

  async markAllLogsAsRead(recipientId: string, businessId: string): Promise<{ count: number }> {
    const { count } = await this.prisma.notificationLog.updateMany({
      where: {
        recipientId: requireScope(recipientId, 'recipientId'),
        businessId: requireScope(businessId, 'businessId'),
        readAt: null,
      },
      data: { status: 'read', readAt: new Date() },
    });
    return { count };
  }
}
