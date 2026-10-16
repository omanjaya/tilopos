import { Controller, Get, Post, Patch, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import {
  CreateStockOpnameDto,
  UpdateOpnameItemsDto,
  ListStockOpnameQueryDto,
} from '../../application/dtos/stock-opname.dto';
import { CreateStockOpnameUseCase } from '../../application/use-cases/stock-opname/create-stock-opname.use-case';
import { UpdateOpnameItemsUseCase } from '../../application/use-cases/stock-opname/update-opname-items.use-case';
import { CompleteStockOpnameUseCase } from '../../application/use-cases/stock-opname/complete-stock-opname.use-case';
import { CancelStockOpnameUseCase } from '../../application/use-cases/stock-opname/cancel-stock-opname.use-case';
import { StockOpnameService } from './stock-opname.service';

@ApiTags('Stock Opname')
@ApiBearerAuth()
@Controller('inventory/stock-opname')
export class StockOpnameController {
  constructor(
    private readonly tenant: TenantAccessService,
    private readonly opnames: StockOpnameService,
    private readonly createOpname: CreateStockOpnameUseCase,
    private readonly updateItems: UpdateOpnameItemsUseCase,
    private readonly completeOpname: CompleteStockOpnameUseCase,
    private readonly cancelOpname: CancelStockOpnameUseCase,
  ) {}

  @Get()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'List stock opname sessions' })
  async list(@Query() query: ListStockOpnameQueryDto, @CurrentUser() user: AuthUser) {
    return this.opnames.list(user, query);
  }

  @Get(':id')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Get stock opname detail with items' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.opnames.getById(user, id);
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY)
  @ApiOperation({ summary: 'Create a new stock opname session' })
  async create(@Body() dto: CreateStockOpnameDto, @CurrentUser() user: AuthUser) {
    await this.tenant.assertOutlet(user, dto.outletId);
    return this.createOpname.execute({
      businessId: user.businessId,
      outletId: dto.outletId,
      employeeId: user.employeeId,
      productIds: dto.productIds,
      notes: dto.notes,
    });
  }

  @Patch(':id/items')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER, EmployeeRole.INVENTORY, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Update actual counts for opname items' })
  async updateOpnameItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpnameItemsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateItems.execute({
      opnameId: id,
      businessId: user.businessId,
      items: dto.items,
    });
  }

  @Post(':id/complete')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Complete opname and apply stock adjustments' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.completeOpname.execute({
      opnameId: id,
      businessId: user.businessId,
      employeeId: user.employeeId,
    });
  }

  @Post(':id/cancel')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Cancel a stock opname session' })
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.cancelOpname.execute({ opnameId: id, businessId: user.businessId });
  }
}
