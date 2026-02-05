import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { WaitingListService } from './waiting-list.service';
import { WaitingListStatus } from '@prisma/client';

@ApiTags('Waiting List')
@Controller('waiting-list')
export class WaitingListController {
  constructor(private readonly waitingListService: WaitingListService) {}

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
  ) {
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
    @Query('status') status?: WaitingListStatus,
  ) {
    return this.waitingListService.findByOutlet(outletId, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get waiting list statistics for outlet' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  async getStats(@Query('outletId') outletId: string) {
    return this.waitingListService.getStats(outletId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get waiting list entry by ID' })
  async findById(@Param('id') id: string) {
    return this.waitingListService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/position')
  @ApiOperation({ summary: 'Get queue position for entry' })
  async getQueuePosition(@Param('id') id: string) {
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
  ) {
    return this.waitingListService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/notify')
  @ApiOperation({ summary: 'Notify customer that table is ready' })
  async notify(@Param('id') id: string) {
    return this.waitingListService.notify(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/seat')
  @ApiOperation({ summary: 'Seat customer at table' })
  async seat(@Param('id') id: string, @Body() dto: { tableId: string }) {
    return this.waitingListService.seat(id, dto.tableId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel waiting list entry' })
  async cancel(@Param('id') id: string) {
    return this.waitingListService.cancel(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/no-show')
  @ApiOperation({ summary: 'Mark customer as no-show' })
  async markNoShow(@Param('id') id: string) {
    return this.waitingListService.markNoShow(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete waiting list entry' })
  async delete(@Param('id') id: string) {
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
