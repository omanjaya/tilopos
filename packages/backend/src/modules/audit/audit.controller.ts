import { Controller, Get, Post, Query, Body, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IAuditLogRepository } from '../../domain/interfaces/repositories/audit.repository';
import { AuditService } from './audit.service';
import {
  ComplianceExportDto,
  ExportFormat,
  SuspiciousActivityType,
} from '../../application/dtos/audit.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@Controller('audit')
export class AuditController {
  constructor(
    @Inject(REPOSITORY_TOKENS.AUDIT)
    private readonly auditRepo: IAuditLogRepository,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs by date range' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async list(@CurrentUser() user: AuthUser, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.auditRepo.findByDateRange(user.businessId, start, end);
  }

  @Get('entity')
  @ApiOperation({ summary: 'Get audit logs by entity' })
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  async byEntity(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.auditRepo.findByEntity(entityType, entityId);
  }

  // ======================================================================
  // SUSPICIOUS ACTIVITY DETECTION
  // ======================================================================

  @Get('suspicious-activities')
  @ApiOperation({
    summary: 'Get flagged suspicious activities',
    description: 'Detects patterns like multiple voids, unusual discounts, cash drawer abuse, after-hours, and large refunds',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'types', required: false, isArray: true, enum: SuspiciousActivityType })
  @ApiQuery({ name: 'outletId', required: false })
  async getSuspiciousActivities(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('types') types?: SuspiciousActivityType | SuspiciousActivityType[],
    @Query('outletId') outletId?: string,
  ) {
    const typesArray = types
      ? Array.isArray(types) ? types : [types]
      : undefined;

    return this.auditService.detectSuspiciousActivities(
      user.businessId,
      new Date(startDate),
      new Date(endDate),
      typesArray,
      outletId,
    );
  }

  // ======================================================================
  // COMPLIANCE EXPORT
  // ======================================================================

  @Post('compliance-export')
  @ApiOperation({
    summary: 'Generate compliance report (CSV or JSON)',
    description: 'Exports audit trail for tax compliance with date range, action type, and employee filters',
  })
  async generateComplianceExport(
    @CurrentUser() user: AuthUser,
    @Body() dto: ComplianceExportDto,
  ) {
    return this.auditService.generateComplianceExport(
      user.businessId,
      new Date(dto.startDate),
      new Date(dto.endDate),
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
    summary: 'Get flagged suspicious activities (last 30 days by default)',
    description: 'Quick detection of suspicious patterns: multiple voids, large discounts, after-hours transactions, repeated failed logins',
  })
  async getSuspiciousActivity(
    @CurrentUser() user: AuthUser,
  ) {
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
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', required: true, enum: ExportFormat })
  @ApiQuery({ name: 'actionTypes', required: false, isArray: true })
  @ApiQuery({ name: 'employeeId', required: false })
  async getComplianceExport(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: ExportFormat,
    @Query('actionTypes') actionTypes?: string | string[],
    @Query('employeeId') employeeId?: string,
  ) {
    const actionTypesArray = actionTypes
      ? Array.isArray(actionTypes) ? actionTypes : [actionTypes]
      : undefined;

    return this.auditService.exportComplianceReport(
      user.businessId,
      new Date(startDate),
      new Date(endDate),
      format,
      actionTypesArray,
      employeeId,
    );
  }

  // ======================================================================
  // AUDIT SUMMARY
  // ======================================================================

  @Get('summary')
  @ApiOperation({
    summary: 'Get audit summary stats',
    description: 'Returns aggregated counts by action, entity type, employee, and suspicious activity count',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAuditSummary(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.auditService.getAuditSummary(user.businessId, start, end);
  }
}
