import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { WaitingListService } from './waiting-list.service';
import { WaitingListStatus } from '@prisma/client';

@ApiTags('Waiting List')
@Controller('waiting-list')
export class WaitingListController {
  constructor(
    private readonly waitingListService: WaitingListService,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyOutletAccess(outletId: string, user: AuthUser): Promise<void> {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, businessId: user.businessId },
    });
    if (!outlet) {
      throw new ForbiddenException('Access denied to this outlet');
    }
  }

  private async verifyEntryAccess(entryId: string, user: AuthUser): Promise<void> {
    const entry = await this.prisma.waitingList.findUnique({
      where: { id: entryId },
      select: { outlet: { select: { businessId: true } } },
    });
    if (!entry || entry.outlet.businessId !== user.businessId) {
      throw new ForbiddenException('Access denied to this entry');
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Add customer to waiting list' })
  async create(
    @Body()
    dto: {
      outletId: string;
      customerName: string;
      customerPhone?: string;
      partySize: number;
      preferredSection?: string;
      notes?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyOutletAccess(dto.outletId, user);
    return this.waitingListService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get waiting list for outlet' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['waiting', 'notified', 'seated', 'cancelled', 'no_show'],
  })
  async findByOutlet(
    @Query('outletId') outletId: string,
    @Query('status') status: WaitingListStatus | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyOutletAccess(outletId, user);
    return this.waitingListService.findByOutlet(outletId, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get waiting list statistics for outlet' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  async getStats(@Query('outletId') outletId: string, @CurrentUser() user: AuthUser) {
    await this.verifyOutletAccess(outletId, user);
    return this.waitingListService.getStats(outletId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get waiting list entry by ID' })
  async findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/position')
  @ApiOperation({ summary: 'Get queue position for entry' })
  async getQueuePosition(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.getQueuePosition(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update waiting list entry' })
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      status?: WaitingListStatus;
      tableId?: string;
      notes?: string;
      estimatedWait?: number;
    },
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/notify')
  @ApiOperation({ summary: 'Notify customer that table is ready' })
  async notify(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.notify(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/seat')
  @ApiOperation({ summary: 'Seat customer at table' })
  async seat(
    @Param('id') id: string,
    @Body() dto: { tableId: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (!dto.tableId) {
      throw new BadRequestException('tableId is required');
    }
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.seat(id, dto.tableId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel waiting list entry' })
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.cancel(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/no-show')
  @ApiOperation({ summary: 'Mark customer as no-show' })
  async markNoShow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyEntryAccess(id, user);
    return this.waitingListService.markNoShow(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete waiting list entry' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyEntryAccess(id, user);
    await this.waitingListService.delete(id);
    return { message: 'Waiting list entry deleted' };
  }

  // Public endpoint untuk customer check status
  @Get('public/:id')
  @ApiOperation({ summary: 'Public: Check queue position (no auth required)' })
  async publicGetPosition(@Param('id') id: string) {
    const entry = await this.waitingListService.findById(id);
    if (!entry) {
      return { error: 'Entry not found' };
    }
    const position = await this.waitingListService.getQueuePosition(id);
    return {
      customerName: entry.customerName,
      partySize: entry.partySize,
      status: entry.status,
      ...position,
    };
  }
}
