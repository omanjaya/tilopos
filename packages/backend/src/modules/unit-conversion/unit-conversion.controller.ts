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
import {
  UnitConversionService,
  type CreateUnitConversionDto,
  type UpdateUnitConversionDto,
} from './unit-conversion.service';

@Controller('unit-conversions')
@UseGuards(JwtAuthGuard)
export class UnitConversionController {
  constructor(private readonly service: UnitConversionService) {}

  @Get('product/:productId')
  async listByProduct(@Param('productId') productId: string) {
    const conversions = await this.service.listByProduct(productId);
    return { conversions };
  }

  @Post()
  async create(@Body() dto: CreateUnitConversionDto) {
    const conversion = await this.service.create(dto);
    return { conversion };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUnitConversionDto) {
    const conversion = await this.service.update(id, dto);
    return { conversion };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
  }

  @Get('convert/:productId')
  async convert(
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
    @Query('from') fromUnit: string,
    @Query('to') toUnit: string,
  ) {
    const qty = parseFloat(quantity) || 1;
    return this.service.convert(productId, qty, fromUnit, toUnit);
  }

  @Get('stock/:productId/:outletId')
  async getStockInAllUnits(
    @Param('productId') productId: string,
    @Param('outletId') outletId: string,
  ) {
    return this.service.getStockInAllUnits(productId, outletId);
  }
}
