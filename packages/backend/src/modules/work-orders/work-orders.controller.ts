import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { Roles } from '@infrastructure/auth/roles.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '@shared/constants/roles';
import { WorkOrdersService } from './work-orders.service';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  WorkOrderItemDto,
  WorkOrderListQueryDto,
} from './work-orders.dto';

/** Front-of-house staff manage work orders (frontend /app/work-orders). */
const FRONT_OF_HOUSE = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
];
const SUPERVISION = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR];

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get('outlet/:outletId')
  async list(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: WorkOrderListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.list(outletId, user.businessId, query);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.workOrdersService.findById(id, user.businessId);
  }

  @Post()
  @Roles(...FRONT_OF_HOUSE)
  async create(@Body() body: CreateWorkOrderDto, @CurrentUser() user: AuthUser) {
    return this.workOrdersService.create(user.businessId, body);
  }

  @Put(':id')
  @Roles(...FRONT_OF_HOUSE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWorkOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (body.finalCost !== undefined && !SUPERVISION.includes(user.role as EmployeeRole)) {
      throw new ForbiddenException('Only supervisors and above can set the final cost');
    }
    return this.workOrdersService.update(id, user.businessId, body);
  }

  @Put(':id/status')
  @Roles(...FRONT_OF_HOUSE)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWorkOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.updateStatus(id, user.businessId, body.status);
  }

  @Post(':id/items')
  @Roles(...FRONT_OF_HOUSE)
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: WorkOrderItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workOrdersService.addItem(id, user.businessId, body);
  }

  @Delete('items/:itemId')
  @Roles(...SUPERVISION)
  async removeItem(@Param('itemId', ParseUUIDPipe) itemId: string, @CurrentUser() user: AuthUser) {
    return this.workOrdersService.removeItem(itemId, user.businessId);
  }

  @Get(':id/total')
  async calculateTotal(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.workOrdersService.calculateTotal(id, user.businessId);
  }
}
