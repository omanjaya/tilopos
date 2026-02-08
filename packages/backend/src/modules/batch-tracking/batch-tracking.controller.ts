import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import {
  BatchTrackingService,
  type CreateBatchLotDto,
  type UpdateBatchLotDto,
} from './batch-tracking.service';

@Controller('batch-tracking')
@UseGuards(JwtAuthGuard)
export class BatchTrackingController {
  constructor(private readonly service: BatchTrackingService) {}

  @Get('product/:productId/outlet/:outletId')
  async listByProduct(
    @Param('productId') productId: string,
    @Param('outletId') outletId: string,
  ) {
    const batches = await this.service.listByProduct(productId, outletId);
    return { batches };
  }

  @Get('active/:productId/:outletId')
  async listActive(
    @Param('productId') productId: string,
    @Param('outletId') outletId: string,
  ) {
    const batches = await this.service.listActive(productId, outletId);
    return { batches };
  }

  @Post()
  async create(@Body() dto: CreateBatchLotDto) {
    const batch = await this.service.create(dto);
    return { batch };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBatchLotDto) {
    const batch = await this.service.update(id, dto);
    return { batch };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
  }

  @Get('summary/:productId/:outletId')
  async getBatchSummary(
    @Param('productId') productId: string,
    @Param('outletId') outletId: string,
  ) {
    return this.service.getBatchSummary(productId, outletId);
  }

  @Get('expiring/:outletId')
  async getExpiringBatches(
    @Param('outletId') outletId: string,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    const batches = await this.service.getExpiringBatches(outletId, daysAhead);
    return { batches, daysAhead };
  }

  @Get('expired/:outletId')
  async getExpiredBatches(@Param('outletId') outletId: string) {
    const batches = await this.service.getExpiredBatches(outletId);
    return { batches };
  }

  @Post('deduct')
  async deductFIFO(
    @Body() body: { productId: string; outletId: string; quantity: number },
  ) {
    return this.service.deductFIFO(body.productId, body.outletId, body.quantity);
  }
}
