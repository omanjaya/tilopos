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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import {
  SerialNumbersService,
  type RegisterSerialNumberDto,
  type BulkRegisterItemDto,
} from './serial-numbers.service';

@Controller('serial-numbers')
@UseGuards(JwtAuthGuard)
export class SerialNumbersController {
  constructor(private readonly service: SerialNumbersService) {}

  @Get('product/:productId/:outletId')
  async listByProduct(
    @Param('productId') productId: string,
    @Param('outletId') outletId: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const serials = await this.service.listByProduct(productId, outletId, user.businessId, status);
    return { serials };
  }

  @Get('customer/:customerId')
  async listByCustomer(@Param('customerId') customerId: string, @CurrentUser() user: AuthUser) {
    const serials = await this.service.listByCustomer(customerId, user.businessId);
    return { serials };
  }

  @Get('warranty-expiring')
  async getWarrantyExpiring(
    @Query('days') days: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 30;
    const serials = await this.service.getWarrantyExpiring(user.businessId, daysAhead);
    return { serials, days: daysAhead };
  }

  @Get('lookup/:serialNumber')
  async lookupBySerial(@Param('serialNumber') serialNumber: string, @CurrentUser() user: AuthUser) {
    return this.service.findBySerial(serialNumber, user.businessId);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findById(id, user.businessId);
  }

  @Post()
  async register(@Body() dto: RegisterSerialNumberDto, @CurrentUser() user: AuthUser) {
    const serial = await this.service.register(user.businessId, dto);
    return { serial };
  }

  @Post('bulk')
  async bulkRegister(
    @Body() body: { items: BulkRegisterItemDto[] },
    @CurrentUser() user: AuthUser,
  ) {
    const serials = await this.service.bulkRegister(user.businessId, body.items);
    return { serials, count: serials.length };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      serialNumber: string;
      purchaseDate: string | null;
      warrantyExpiry: string | null;
      costPrice: number | null;
      notes: string | null;
    }>,
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.update(id, user.businessId, dto);
    return { serial };
  }

  @Put(':id/sold')
  async markSold(
    @Param('id') id: string,
    @Body() body: { customerId?: string; transactionId?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markSold(
      id,
      user.businessId,
      body.customerId,
      body.transactionId,
    );
    return { serial };
  }

  @Put(':id/returned')
  async markReturned(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markReturned(id, user.businessId, body.notes);
    return { serial };
  }

  @Put(':id/warranty')
  async markWarranty(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markWarranty(id, user.businessId, body.notes);
    return { serial };
  }

  @Put(':id/defective')
  async markDefective(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const serial = await this.service.markDefective(id, user.businessId, body.notes);
    return { serial };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.service.delete(id, user.businessId);
  }
}
