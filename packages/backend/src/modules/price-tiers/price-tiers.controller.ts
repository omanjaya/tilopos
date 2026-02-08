import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { PriceTiersService, type CreatePriceTierDto, type UpdatePriceTierDto } from './price-tiers.service';

@Controller('price-tiers')
@UseGuards(JwtAuthGuard)
export class PriceTiersController {
  constructor(private readonly service: PriceTiersService) {}

  @Get('product/:productId')
  async listByProduct(@Param('productId') productId: string) {
    const tiers = await this.service.listByProduct(productId);
    return { tiers };
  }

  @Post()
  async create(@Body() dto: CreatePriceTierDto) {
    const tier = await this.service.create(dto);
    return { tier };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePriceTierDto) {
    const tier = await this.service.update(id, dto);
    return { tier };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
  }

  @Post('product/:productId/bulk')
  async bulkCreate(
    @Param('productId') productId: string,
    @Body() body: { tiers: Omit<CreatePriceTierDto, 'productId'>[] },
  ) {
    const result = await this.service.bulkCreateForProduct(productId, body.tiers);
    return { created: result.count };
  }

  @Get('resolve/:productId')
  async resolvePrice(
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
  ) {
    const qty = parseFloat(quantity) || 1;
    return this.service.resolvePrice(productId, qty);
  }
}
