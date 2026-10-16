import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import {
  CreateTransferTemplateDto,
  UpdateTransferTemplateDto,
} from '../../application/dtos/stock-transfer.dto';
import { TransferTemplatesService } from './transfer-templates.service';

@ApiTags('Transfer Templates')
@ApiBearerAuth()
@Controller('transfer-templates')
export class TransferTemplatesController {
  constructor(private readonly templatesService: TransferTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all transfer templates' })
  async list(@CurrentUser() user: AuthUser) {
    return this.templatesService.list(user.businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transfer template by ID' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.templatesService.get(id, user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Create a new transfer template' })
  async create(@Body() dto: CreateTransferTemplateDto, @CurrentUser() user: AuthUser) {
    return this.templatesService.create(user.businessId, user.employeeId, dto);
  }

  @Put(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Update a transfer template' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransferTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.templatesService.update(id, user.businessId, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Delete a transfer template' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.templatesService.delete(id, user.businessId);
    return { message: 'Template deleted successfully' };
  }
}
