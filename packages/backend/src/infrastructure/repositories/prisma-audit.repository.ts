import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  IAuditLogRepository,
  AuditLogRecord,
} from '../../domain/interfaces/repositories/audit.repository';

@Injectable()
export class PrismaAuditRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AuditLogRecord): Promise<AuditLogRecord> {
    const created = await this.prisma.auditLog.create({
      data: {
        id: data.id,
        businessId: data.businessId,
        outletId: data.outletId,
        employeeId: data.employeeId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: (data.oldValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        newValue: (data.newValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: data.ipAddress,
        deviceId: data.deviceId,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    return this.mapToRecord(created);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => this.mapToRecord(log));
  }

  async findByDateRange(businessId: string, start: Date, end: Date): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        businessId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => this.mapToRecord(log));
  }

  private mapToRecord(log: {
    id: string;
    businessId: string;
    outletId: string | null;
    employeeId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    oldValue: Prisma.JsonValue | null;
    newValue: Prisma.JsonValue | null;
    ipAddress: string | null;
    deviceId: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }): AuditLogRecord {
    return {
      id: log.id,
      businessId: log.businessId,
      outletId: log.outletId,
      employeeId: log.employeeId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      deviceId: log.deviceId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}
