import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

export interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface GetActivityLogInput {
  employeeId: string;
  page?: number;
  limit?: number;
}

export interface GetActivityLogOutput {
  activities: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetActivityLogUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(input: GetActivityLogInput): Promise<GetActivityLogOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const { data, total } = await this.auditRepo.findByEmployee(input.employeeId, { page, limit });

    const activities: ActivityLogEntry[] = data.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: ((log.metadata as Record<string, unknown>)?.userAgent as string | null) ?? null,
      createdAt: log.createdAt,
      oldValue: log.oldValue as Record<string, unknown> | null,
      newValue: log.newValue as Record<string, unknown> | null,
    }));

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
