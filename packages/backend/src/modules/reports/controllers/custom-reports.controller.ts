import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import {
  CustomReportConfigDto,
  SaveReportTemplateDto,
} from '../../../application/dtos/report-query.dto';
import { ReportsService } from '../reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class CustomReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('custom')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Build a custom report with user-defined metrics, dimensions, and filters',
  })
  async buildCustomReport(@CurrentUser() user: AuthUser, @Body() config: CustomReportConfigDto) {
    return this.reportsService.buildCustomReport(user, config);
  }

  @Get('custom/metrics')
  @ApiOperation({
    summary: 'Get available metrics and dimensions for the custom report builder',
  })
  getAvailableMetrics() {
    return this.reportsService.getAvailableMetrics();
  }

  @Post('custom/templates')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({
    summary: 'Save a report configuration as a reusable template',
  })
  async saveReportTemplate(@CurrentUser() user: AuthUser, @Body() dto: SaveReportTemplateDto) {
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
