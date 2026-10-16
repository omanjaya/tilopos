import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { AuditService } from './audit.service';
import {
  AuditDateRangeQueryDto,
  AuditEntityQueryDto,
  AuditListQueryDto,
  ComplianceExportDto,
  ComplianceExportQueryDto,
  SuspiciousActivityQueryDto,
} from '../../application/dtos/audit.dto';
import { RequireFeature } from '../../common/guards/feature.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@RequireFeature('audit_log')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit logs by date range (newest first, page/limit, max 100 per page)',
  })
  async list(@CurrentUser() user: AuthUser, @Query() query: AuditListQueryDto) {
    const { start, end } = this.auditService.resolveRange(query.startDate, query.endDate);
    return this.auditService.listLogs(user.businessId, start, end, query);
  }

  @Get('entity')
  @ApiOperation({ summary: 'Get audit logs by entity (page/limit, max 100 per page)' })
  async byEntity(@CurrentUser() user: AuthUser, @Query() query: AuditEntityQueryDto) {
    return this.auditService.listByEntity(user.businessId, query.entityType, query.entityId, query);
  }

  // ======================================================================
  // SUSPICIOUS ACTIVITY DETECTION
  // ======================================================================

  @Get('suspicious-activities')
  @ApiOperation({
    summary: 'Get flagged suspicious activities',
    description:
      'Detects multiple voids, unusual discounts, after-hours activity and large refunds',
  })
  async getSuspiciousActivities(
    @CurrentUser() user: AuthUser,
    @Query() query: SuspiciousActivityQueryDto,
  ) {
    const { start, end } = this.auditService.resolveRange(query.startDate, query.endDate);
    return this.auditService.detectSuspiciousActivities(
      user.businessId,
      start,
      end,
      query.types,
      query.outletId,
    );
  }

  // ======================================================================
  // COMPLIANCE EXPORT
  // ======================================================================

  @Post('compliance-export')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Generate compliance report (CSV or JSON)',
    description:
      'Exports audit trail for tax compliance with date range, action type, and employee filters',
  })
  async generateComplianceExport(@CurrentUser() user: AuthUser, @Body() dto: ComplianceExportDto) {
    const { start, end } = this.auditService.resolveRange(dto.startDate, dto.endDate);
    return this.auditService.generateComplianceExport(
      user.businessId,
      start,
      end,
      dto.format,
      dto.actionTypes,
      dto.employeeId,
    );
  }

  // ======================================================================
  // SUSPICIOUS ACTIVITY (convenience GET endpoint, auto-detects last 30 days)
  // ======================================================================

  @Get('suspicious-activity')
  @ApiOperation({
    summary: 'Get flagged suspicious activities (last 30 days)',
  })
  async getSuspiciousActivity(@CurrentUser() user: AuthUser) {
    return this.auditService.detectSuspiciousActivity(user.businessId);
  }

  // ======================================================================
  // COMPLIANCE EXPORT (GET-based endpoint)
  // ======================================================================

  @Get('compliance-export')
  @ApiOperation({
    summary: 'Export compliance report (CSV or JSON) via GET',
    description: 'Exports audit logs filtered by action type, employee, and date range',
  })
  async getComplianceExport(
    @CurrentUser() user: AuthUser,
    @Query() query: ComplianceExportQueryDto,
  ) {
    const { start, end } = this.auditService.resolveRange(query.startDate, query.endDate);
    return this.auditService.exportComplianceReport(
      user.businessId,
      start,
      end,
      query.format,
      query.actionTypes,
      query.employeeId,
    );
  }

  // ======================================================================
  // AUDIT SUMMARY
  // ======================================================================

  @Get('summary')
  @ApiOperation({
    summary: 'Get audit summary stats',
    description:
      'Returns aggregated counts by action, entity type, employee, and suspicious activity count',
  })
  async getAuditSummary(@CurrentUser() user: AuthUser, @Query() query: AuditDateRangeQueryDto) {
    const { start, end } = this.auditService.resolveRange(query.startDate, query.endDate);
    return this.auditService.getAuditSummary(user.businessId, start, end);
  }
}
