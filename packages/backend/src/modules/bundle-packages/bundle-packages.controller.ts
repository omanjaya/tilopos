import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '@shared/constants/roles';
import { BundlePackagesService } from './bundle-packages.service';
import {
  BundleListQueryDto,
  CreateBundlePackageDto,
  UpdateBundlePackageDto,
} from '@application/dtos/bundle-package.dto';

@Controller('bundle-packages')
export class BundlePackagesController {
  constructor(private readonly service: BundlePackagesService) {}

  @Get()
  @Roles(
    EmployeeRole.OWNER,
    EmployeeRole.SUPER_ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.SUPERVISOR,
  )
  async list(@CurrentUser() user: AuthUser, @Query() query: BundleListQueryDto) {
    return this.service.findAll(user.businessId, query);
  }

  @Get('pos/:outletId')
  @Roles(
    EmployeeRole.CASHIER,
    EmployeeRole.SUPERVISOR,
    EmployeeRole.MANAGER,
    EmployeeRole.OWNER,
    EmployeeRole.SUPER_ADMIN,
  )
  async getForPOS(
    @CurrentUser() user: AuthUser,
    @Param('outletId', ParseUUIDPipe) outletId: string,
  ) {
    return this.service.findForPOS(outletId, user.businessId);
  }

  @Get(':id')
  @Roles(
    EmployeeRole.OWNER,
    EmployeeRole.SUPER_ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.SUPERVISOR,
  )
  async getById(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id, user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBundlePackageDto) {
    return this.service.create(user.businessId, dto);
  }

  @Put(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBundlePackageDto,
  ) {
    return this.service.update(id, user.businessId, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.SUPER_ADMIN, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.softDelete(id, user.businessId);
  }
}
