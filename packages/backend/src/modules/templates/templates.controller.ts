import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TemplatesService } from './templates.service';
import { ApplyTemplateDto } from './apply-template.dto';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPER_ADMIN)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async listTemplates() {
    return this.templatesService.listTemplates();
  }

  @Get(':typeCode')
  async getTemplate(@Param('typeCode') typeCode: string) {
    return this.templatesService.getTemplate(typeCode);
  }

  @Post('apply')
  async applyTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyTemplateDto,
  ) {
    return this.templatesService.applyTemplate(
      user.businessId,
      dto.outletId,
      dto.typeCode,
      dto.sections,
    );
  }
}
