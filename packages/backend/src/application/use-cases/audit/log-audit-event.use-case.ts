import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

export interface LogAuditEventInput {
  businessId: string;
  outletId?: string;
  employeeId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LogAuditEventUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(input: LogAuditEventInput): Promise<void> {
    await this.auditRepo.create({
      id: '',
      businessId: input.businessId,
      outletId: input.outletId || null,
      employeeId: input.employeeId || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      oldValue: input.oldValue || null,
      newValue: input.newValue || null,
      ipAddress: input.ipAddress || null,
      deviceId: input.deviceId || null,
      metadata: input.metadata || {},
      createdAt: new Date(),
    });
  }
}
