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
import {
  CreateBatchLotDto,
  UpdateBatchLotDto,
  DeductBatchFifoDto,
  ExpiringBatchesQueryDto,
} from '@application/dtos/batch-lot.dto';
import { BatchTrackingService } from './batch-tracking.service';

const BATCH_WRITERS = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY];

@Controller('batch-tracking')
export class BatchTrackingController {
  constructor(private readonly service: BatchTrackingService) {}

  @Get('product/:productId/outlet/:outletId')
  async listByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const batches = await this.service.listByProduct(user, productId, outletId);
    return { batches };
  }

  @Get('active/:productId/:outletId')
  async listActive(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const batches = await this.service.listActive(user, productId, outletId);
    return { batches };
  }

  @Post()
  @Roles(...BATCH_WRITERS)
  async create(@Body() dto: CreateBatchLotDto, @CurrentUser() user: AuthUser) {
    const batch = await this.service.create(user, dto);
    return { batch };
  }

  @Put(':id')
  @Roles(...BATCH_WRITERS)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchLotDto,
    @CurrentUser() user: AuthUser,
  ) {
    const batch = await this.service.update(user, id, dto);
    return { batch };
  }

  @Delete(':id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.service.delete(user, id);
  }

  @Get('summary/:productId/:outletId')
  async getBatchSummary(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getBatchSummary(user, productId, outletId);
  }

  @Get('expiring/:outletId')
  async getExpiringBatches(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() query: ExpiringBatchesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const daysAhead = query.days ?? 7;
    const batches = await this.service.getExpiringBatches(user, outletId, daysAhead);
    return { batches, daysAhead };
  }

  @Get('expired/:outletId')
  async getExpiredBatches(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const batches = await this.service.getExpiredBatches(user, outletId);
    return { batches };
  }

  @Post('deduct')
  @Roles(...BATCH_WRITERS)
  async deductFIFO(@Body() dto: DeductBatchFifoDto, @CurrentUser() user: AuthUser) {
    return this.service.deductFIFO(user, dto.productId, dto.outletId, dto.quantity);
  }

  // Must be AFTER all static routes
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const batch = await this.service.findById(user, id);
    return { batch };
  }
}
