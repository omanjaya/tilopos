import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { ReportsService, type CustomReportConfig } from '../reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class CustomReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('custom')
  @ApiOperation({
    summary: 'Build a custom report with user-defined metrics, dimensions, and filters',
  })
  async buildCustomReport(@CurrentUser() user: AuthUser, @Body() config: CustomReportConfig) {
    return this.reportsService.buildCustomReport(user.businessId, config);
  }

  @Get('custom/metrics')
  @ApiOperation({
    summary: 'Get available metrics and dimensions for the custom report builder',
  })
  getAvailableMetrics() {
    return this.reportsService.getAvailableMetrics();
  }

  @Post('custom/templates')
  @ApiOperation({
    summary: 'Save a report configuration as a reusable template',
  })
  async saveReportTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: { name: string; config: CustomReportConfig },
  ) {
    return this.reportsService.saveReportTemplate(user.businessId, dto.name, dto.config);
  }

  @Get('custom/templates')
  @ApiOperation({
    summary: 'List saved report templates for the business',
  })
  async getSavedTemplates(@CurrentUser() user: AuthUser) {
    return this.reportsService.getSavedTemplates(user.businessId);
  }
}
