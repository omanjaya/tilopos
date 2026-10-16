import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  IAuditLogRepository,
  AuditLogRecord,
} from '../../domain/interfaces/repositories/audit.repository';

/** Upper bound for the non-paginated finders below (R13). */
const MAX_AUDIT_ROWS = 1000;

@Injectable()
export class PrismaAuditRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AuditLogRecord): Promise<AuditLogRecord> {
    const created = await this.prisma.auditLog.create({
      data: {
        id: data.id || crypto.randomUUID(),
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

  async findByEmployee(
    employeeId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: AuditLogRecord[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { employeeId } }),
    ]);

    return { data: logs.map((log) => this.mapToRecord(log)), total };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    businessId?: string,
  ): Promise<AuditLogRecord[]> {
    if (!businessId) {
      throw new Error('PrismaAuditRepository.findByEntity: businessId is required');
    }
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType, entityId, businessId },
      orderBy: { createdAt: 'desc' },
      take: MAX_AUDIT_ROWS,
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
      take: MAX_AUDIT_ROWS,
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
