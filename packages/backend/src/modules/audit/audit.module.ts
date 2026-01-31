import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { LogAuditEventUseCase } from '../../application/use-cases/audit/log-audit-event.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaAuditRepository } from '../../infrastructure/repositories/prisma-audit.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    LogAuditEventUseCase,
    PrismaService,
    { provide: REPOSITORY_TOKENS.AUDIT, useClass: PrismaAuditRepository },
  ],
  exports: [LogAuditEventUseCase, AuditService],
})
export class AuditModule {}
