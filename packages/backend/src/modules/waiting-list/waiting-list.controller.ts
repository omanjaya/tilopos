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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { EmployeeRole } from '../../shared/constants/roles';
import { Public } from '@shared/decorators/public.decorator';
import { TenantAccessService } from '@shared/tenant';
import {
  CreateWaitingListEntryDto,
  SeatFromWaitingListDto,
  UpdateWaitingListEntryDto,
  WaitingListQueryDto,
  WaitingListStatsQueryDto,
} from '../../application/dtos/waiting-list.dto';
import { WaitingListService } from './waiting-list.service';

const FRONT_OF_HOUSE = [
  EmployeeRole.CASHIER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
];

@ApiTags('Waiting List')
@Controller('waiting-list')
export class WaitingListController {
  constructor(
    private readonly waitingListService: WaitingListService,
    private readonly tenant: TenantAccessService,
  ) {}

  @ApiBearerAuth()
  @Post()
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Add customer to waiting list' })
  async create(@Body() dto: CreateWaitingListEntryDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId);
    return this.waitingListService.create({
      outletId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      partySize: dto.partySize,
      preferredSection: dto.preferredSection,
      notes: dto.notes,
    });
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get waiting list (one outlet, or all outlets of the business)' })
  async findByOutlet(@Query() query: WaitingListQueryDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    return this.waitingListService.findByOutlet(outletIds, query.status, query.limit);
  }

  @ApiBearerAuth()
  @Get('stats')
  @ApiOperation({ summary: 'Get waiting list statistics (one outlet, or all outlets)' })
  async getStats(@Query() query: WaitingListStatsQueryDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    return this.waitingListService.getStats(outletIds);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get waiting list entry by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.waitingListService.findById(id, user.businessId);
  }

  @ApiBearerAuth()
  @Get(':id/position')
  @ApiOperation({ summary: 'Get queue position for entry' })
  async getQueuePosition(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.waitingListService.findById(id, user.businessId);
    return this.waitingListService.getQueuePosition(id);
  }

  @ApiBearerAuth()
  @Put(':id')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Update waiting list entry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWaitingListEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.waitingListService.update(id, user.businessId, {
      status: dto.status,
      tableId: dto.tableId,
      notes: dto.notes,
      estimatedWait: dto.estimatedWait,
    });
  }

  @ApiBearerAuth()
  @Put(':id/notify')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Notify customer that table is ready' })
  async notify(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.waitingListService.notify(id, user.businessId);
  }

  @ApiBearerAuth()
  @Put(':id/seat')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Seat customer at table' })
  async seat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SeatFromWaitingListDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.waitingListService.seat(id, user.businessId, dto.tableId);
  }

  @ApiBearerAuth()
  @Put(':id/cancel')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Cancel waiting list entry' })
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.waitingListService.cancel(id, user.businessId);
  }

  @ApiBearerAuth()
  @Put(':id/no-show')
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Mark customer as no-show' })
  async markNoShow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.waitingListService.markNoShow(id, user.businessId);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @Roles(EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Delete waiting list entry' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.waitingListService.delete(id, user.businessId);
    return { message: 'Waiting list entry deleted' };
  }

  /** Customer-facing queue status: position and status only, no personal data. */
  @Public()
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  @Get('public/:id')
  @ApiOperation({ summary: 'Public: Check queue position (no auth required)' })
  async publicGetPosition(@Param('id', ParseUUIDPipe) id: string) {
    return this.waitingListService.getPublicPosition(id);
  }
}
