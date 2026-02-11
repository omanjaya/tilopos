import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import {
  TransferTemplatesService,
  type CreateTransferTemplateInput,
  type UpdateTransferTemplateInput,
} from './transfer-templates.service';

@ApiTags('Transfer Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.templatesService.get(id, user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Create a new transfer template' })
  async create(
    @Body() body: Omit<CreateTransferTemplateInput, 'businessId' | 'createdBy'>,
    @CurrentUser() user: AuthUser,
  ) {
    const input: CreateTransferTemplateInput = {
      ...body,
      businessId: user.businessId,
      createdBy: user.employeeId,
    };
    return this.templatesService.create(input);
  }

  @Put(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Update a transfer template' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTransferTemplateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.templatesService.update(id, user.businessId, body);
  }

  @Delete(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Delete a transfer template' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.templatesService.delete(id, user.businessId);
    return { message: 'Template deleted successfully' };
  }
}
