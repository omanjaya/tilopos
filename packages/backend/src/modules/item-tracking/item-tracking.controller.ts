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
} from '@nestjs/common';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '@shared/constants/roles';
import { ItemTrackingService } from './item-tracking.service';
import {
  ReceiveServiceItemDto,
  UpdateServiceItemDto,
  UpdateServiceItemStatusDto,
  ServiceItemListQueryDto,
} from './dto/service-item.dto';

const COUNTER_ROLES = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
];

@Controller('item-tracking')
export class ItemTrackingController {
  constructor(private readonly itemTrackingService: ItemTrackingService) {}

  @Get('outlet/:outletId')
  async listByOutlet(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: ServiceItemListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itemTrackingService.listByOutlet(outletId, user.businessId, query);
  }

  @Get('active/:outletId')
  async getActive(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itemTrackingService.getActive(outletId, user.businessId);
  }

  @Get('customer/:customerId')
  async listByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itemTrackingService.listByCustomer(customerId, user.businessId);
  }

  @Get('ticket/:ticketNumber')
  async findByTicket(@Param('ticketNumber') ticketNumber: string, @CurrentUser() user: AuthUser) {
    return this.itemTrackingService.findByTicket(ticketNumber.slice(0, 50), user.businessId);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.itemTrackingService.findById(id, user.businessId);
  }

  @Post()
  @Roles(...COUNTER_ROLES)
  async receive(@Body() dto: ReceiveServiceItemDto, @CurrentUser() user: AuthUser) {
    return this.itemTrackingService.receive(user.businessId, dto);
  }

  @Put(':id')
  @Roles(...COUNTER_ROLES)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itemTrackingService.update(id, user.businessId, dto);
  }

  @Put(':id/status')
  @Roles(...COUNTER_ROLES)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceItemStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.itemTrackingService.updateStatus(id, user.businessId, dto.status);
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.itemTrackingService.delete(id, user.businessId);
    return { message: 'Service item deleted' };
  }
}
