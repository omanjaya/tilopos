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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  PriceTiersService,
  type CreatePriceTierDto,
  type UpdatePriceTierDto,
} from './price-tiers.service';

@Controller('price-tiers')
@UseGuards(JwtAuthGuard)
export class PriceTiersController {
  constructor(
    private readonly service: PriceTiersService,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyProductAccess(productId: string, businessId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) {
      throw new ForbiddenException('Access denied to this product');
    }
  }

  private async verifyTierAccess(tierId: string, businessId: string): Promise<void> {
    const tier = await this.prisma.priceTier.findFirst({
      where: { id: tierId, product: { businessId } },
    });
    if (!tier) {
      throw new ForbiddenException('Access denied to this price tier');
    }
  }

  @Get('product/:productId')
  async listByProduct(@Param('productId') productId: string, @CurrentUser() user: AuthUser) {
    await this.verifyProductAccess(productId, user.businessId);
    const tiers = await this.service.listByProduct(productId);
    return { tiers };
  }

  @Post()
  async create(@Body() dto: CreatePriceTierDto, @CurrentUser() user: AuthUser) {
    await this.verifyProductAccess(dto.productId, user.businessId);
    const tier = await this.service.create(dto);
    return { tier };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceTierDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyTierAccess(id, user.businessId);
    const tier = await this.service.update(id, dto);
    return { tier };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyTierAccess(id, user.businessId);
    await this.service.delete(id);
  }

  @Post('product/:productId/bulk')
  async bulkCreate(
    @Param('productId') productId: string,
    @Body() body: { tiers: Omit<CreatePriceTierDto, 'productId'>[] },
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyProductAccess(productId, user.businessId);
    const result = await this.service.bulkCreateForProduct(productId, body.tiers);
    return { created: result.count };
  }

  @Get('resolve/:productId')
  async resolvePrice(
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.verifyProductAccess(productId, user.businessId);
    const qty = parseFloat(quantity) || 1;
    return this.service.resolvePrice(productId, qty);
  }

  // Must be AFTER all static routes
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.verifyTierAccess(id, user.businessId);
    const tier = await this.service.findById(id);
    return { tier };
  }
}
