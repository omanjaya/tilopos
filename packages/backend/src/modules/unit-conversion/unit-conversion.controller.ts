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
  CreateUnitConversionDto,
  UpdateUnitConversionDto,
  ConvertUnitQueryDto,
} from '@application/dtos/unit-conversion.dto';
import { UnitConversionService } from './unit-conversion.service';

const UNIT_WRITERS = [EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.INVENTORY];

@Controller('unit-conversions')
export class UnitConversionController {
  constructor(private readonly service: UnitConversionService) {}

  @Get('product/:productId')
  async listByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const conversions = await this.service.listByProduct(user, productId);
    return { conversions };
  }

  @Post()
  @Roles(...UNIT_WRITERS)
  async create(@Body() dto: CreateUnitConversionDto, @CurrentUser() user: AuthUser) {
    const conversion = await this.service.create(user, dto);
    return { conversion };
  }

  @Put(':id')
  @Roles(...UNIT_WRITERS)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitConversionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const conversion = await this.service.update(user, id, dto);
    return { conversion };
  }

  @Delete(':id')
  @Roles(...UNIT_WRITERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.service.delete(user, id);
  }

  @Get('convert/:productId')
  async convert(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ConvertUnitQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.convert(user, productId, query.quantity, query.from, query.to);
  }

  @Get('stock/:productId/:outletId')
  async getStockInAllUnits(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getStockInAllUnits(user, productId, outletId);
  }

  // Must be AFTER all static routes
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const conversion = await this.service.findById(user, id);
    return { conversion };
  }
}
