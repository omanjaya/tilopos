import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { Roles } from '@infrastructure/auth/roles.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '@shared/constants/roles';
import { PriceTiersService } from './price-tiers.service';
import {
  BulkPriceTiersDto,
  CreatePriceTierDto,
  ResolvePriceQueryDto,
  UpdatePriceTierDto,
} from './price-tiers.dto';

/** Price tiers change selling prices used by the POS: managers and owners only. */
const PRICE_EDITORS = [EmployeeRole.OWNER, EmployeeRole.MANAGER];

@ApiTags('Price Tiers')
@ApiBearerAuth()
@Controller('price-tiers')
export class PriceTiersController {
  constructor(private readonly service: PriceTiersService) {}

  @Get('product/:productId')
  async listByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const tiers = await this.service.listByProduct(user.businessId, productId);
    return { tiers };
  }

  @Post()
  @Roles(...PRICE_EDITORS)
  async create(@Body() dto: CreatePriceTierDto, @CurrentUser() user: AuthUser) {
    const tier = await this.service.create(user.businessId, dto);
    return { tier };
  }

  @Put(':id')
  @Roles(...PRICE_EDITORS)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceTierDto,
    @CurrentUser() user: AuthUser,
  ) {
    const tier = await this.service.update(user.businessId, id, dto);
    return { tier };
  }

  @Delete(':id')
  @Roles(...PRICE_EDITORS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.service.delete(user.businessId, id);
  }

  @Post('product/:productId/bulk')
  @Roles(...PRICE_EDITORS)
  async bulkCreate(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: BulkPriceTiersDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.service.bulkCreateForProduct(user.businessId, productId, body.tiers);
    return { created: result.count };
  }

  @Get('resolve/:productId')
  async resolvePrice(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ResolvePriceQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.resolvePrice(user.businessId, productId, query.quantity ?? 1);
  }

  // Must be AFTER all static routes
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const tier = await this.service.findById(user.businessId, id);
    return { tier };
  }
}
