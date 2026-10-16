import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { TemplatesService } from './templates.service';
import { ApplyTemplateDto } from './apply-template.dto';

@ApiTags('Templates')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPER_ADMIN)
@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Get()
  async listTemplates() {
    return this.templatesService.listTemplates();
  }

  @Get(':typeCode')
  async getTemplate(@Param('typeCode') typeCode: string) {
    return this.templatesService.getTemplate(typeCode);
  }

  @Post('apply')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async applyTemplate(@CurrentUser() user: AuthUser, @Body() dto: ApplyTemplateDto) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId);
    return this.templatesService.applyTemplate(
      user.businessId,
      outletId,
      dto.typeCode,
      dto.sections,
    );
  }
}
