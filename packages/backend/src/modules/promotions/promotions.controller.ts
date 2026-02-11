import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IPromotionRepository } from '../../domain/interfaces/repositories/promotion.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApplyPromotionUseCase } from '../../application/use-cases/promotions/apply-promotion.use-case';
import { ValidateVoucherUseCase } from '../../application/use-cases/promotions/validate-voucher.use-case';
import { GenerateVoucherBatchUseCase } from '../../application/use-cases/promotions/generate-voucher-batch.use-case';
import { GenerateVoucherBatchDto } from '../../application/dtos/voucher-batch.dto';
import { randomBytes } from 'crypto';
import { BusinessScoped } from '../../shared/guards/business-scope.guard';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(
    @Inject(REPOSITORY_TOKENS.PROMOTION)
    private readonly promotionRepo: IPromotionRepository,
    private readonly prisma: PrismaService,
    private readonly applyPromotionUseCase: ApplyPromotionUseCase,
    private readonly validateVoucherUseCase: ValidateVoucherUseCase,
    private readonly generateVoucherBatchUseCase: GenerateVoucherBatchUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all promotions for business' })
  async list(@CurrentUser() user: AuthUser) {
    return this.promotionRepo.findByBusinessId(user.businessId);
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Create a new promotion' })
  async create(
    @Body()
    dto: {
      name: string;
      description?: string;
      discountType: 'percentage' | 'fixed' | 'bogo';
      discountValue: number;
      minPurchase?: number;
      maxDiscount?: number;
      validFrom: string;
      validUntil: string;
      usageLimit?: number;
      applicableTo?: Record<string, unknown>;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.promotionRepo.save({
      businessId: user.businessId,
      name: dto.name,
      description: dto.description || null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minPurchase: dto.minPurchase || null,
      maxDiscount: dto.maxDiscount || null,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      usageLimit: dto.usageLimit || null,
      applicableTo: dto.applicableTo || {},
    });
  }

  // ==================== Voucher Endpoints (must be BEFORE :id) ====================

  @Get('vouchers')
  @ApiOperation({ summary: 'List all vouchers for business' })
  async listVouchers(@Query('search') search: string | undefined, @CurrentUser() user: AuthUser) {
    const where: Record<string, unknown> = { businessId: user.businessId };
    if (search) {
      where.code = { contains: search.toUpperCase(), mode: 'insensitive' };
    }

    const vouchers = await this.prisma.voucher.findMany({
      where,
      include: { promotion: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return vouchers.map((v) => {
      const promo = v.promotion;
      return {
        id: v.id,
        code: v.code,
        prefix: v.code.split('-')[0] || v.code,
        discountType: promo?.discountType ?? 'fixed',
        discountValue: promo ? Number(promo.discountValue) : Number(v.initialValue) || 0,
        validFrom: promo?.validFrom?.toISOString() ?? v.createdAt.toISOString(),
        validTo:
          promo?.validUntil?.toISOString() ??
          v.expiresAt?.toISOString() ??
          v.createdAt.toISOString(),
        usageLimit: 1,
        usageCount: v.usedAt ? 1 : 0,
        isActive: v.isActive,
        createdAt: v.createdAt.toISOString(),
      };
    });
  }

  @Post('vouchers/generate')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Generate vouchers with discount details' })
  async generateVouchers(
    @Body()
    dto: {
      prefix: string;
      quantity: number;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      validFrom: string;
      validTo: string;
      usageLimit: number;
    },
    @CurrentUser() user: AuthUser,
  ) {
    // Create a promotion to link the vouchers to
    const promotion = await this.prisma.promotion.create({
      data: {
        businessId: user.businessId,
        name: `Voucher ${dto.prefix}`,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validTo),
        usageLimit: dto.usageLimit,
        applicableTo: {},
      },
    });

    // Generate unique codes
    const existingVouchers = await this.prisma.voucher.findMany({
      where: { code: { startsWith: `${dto.prefix}-` }, businessId: user.businessId },
      select: { code: true },
    });
    const existingCodes = new Set(existingVouchers.map((v) => v.code));

    const codesToCreate: string[] = [];
    let attempts = 0;
    const maxAttempts = dto.quantity * 10;

    while (codesToCreate.length < dto.quantity && attempts < maxAttempts) {
      const random = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
      const code = `${dto.prefix}-${random}`;
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        codesToCreate.push(code);
      }
      attempts++;
    }

    await this.prisma.voucher.createMany({
      data: codesToCreate.map((code) => ({
        businessId: user.businessId,
        promotionId: promotion.id,
        code,
        expiresAt: new Date(dto.validTo),
      })),
    });

    return codesToCreate.map((code) => ({
      id: code,
      code,
      prefix: dto.prefix,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      usageLimit: dto.usageLimit,
      usageCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    }));
  }

  @Get('vouchers/export')
  @ApiOperation({ summary: 'Export vouchers as CSV' })
  async exportVouchers(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const vouchers = await this.prisma.voucher.findMany({
      where: { businessId: user.businessId },
      include: { promotion: true },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Code,Discount Type,Discount Value,Valid From,Valid To,Used,Active,Created At\n';
    const rows = vouchers.map((v) => {
      const promo = v.promotion;
      return [
        v.code,
        promo?.discountType ?? 'fixed',
        promo ? Number(promo.discountValue) : Number(v.initialValue) || 0,
        promo?.validFrom?.toISOString() ?? '',
        promo?.validUntil?.toISOString() ?? v.expiresAt?.toISOString() ?? '',
        v.usedAt ? 'Yes' : 'No',
        v.isActive ? 'Yes' : 'No',
        v.createdAt.toISOString(),
      ].join(',');
    });

    const csv = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vouchers.csv');
    res.send(csv);
  }

  @Post('vouchers/validate')
  @ApiOperation({ summary: 'Validate voucher code' })
  async validateVoucher(
    @Body() dto: { code: string; total: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.validateVoucherUseCase.execute({
      code: dto.code,
      businessId: user.businessId,
      total: dto.total,
    });
  }

  @Post('vouchers/:voucherId/use')
  @ApiOperation({ summary: 'Mark voucher as used' })
  async useVoucher(@Param('voucherId') voucherId: string, @Body() dto: { customerId: string }) {
    await this.validateVoucherUseCase.markVoucherAsUsed(voucherId, dto.customerId);
    return { message: 'Voucher marked as used' };
  }

  @Post('vouchers/batch')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Generate batch of vouchers for a promotion' })
  async generateVoucherBatch(@Body() dto: GenerateVoucherBatchDto, @CurrentUser() user: AuthUser) {
    return this.generateVoucherBatchUseCase.execute({
      businessId: user.businessId,
      promotionId: dto.promotionId,
      prefix: dto.prefix,
      quantity: dto.quantity,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  // ==================== Promotion Rules Engine ====================

  @Post('apply')
  @ApiOperation({ summary: 'Apply applicable promotions to transaction' })
  async applyPromotion(
    @Body()
    dto: {
      items: Array<{ productId: string; variantId?: string; quantity: number; price: number }>;
      total: number;
      promotionId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.applyPromotionUseCase.execute({
      businessId: user.businessId,
      outletId: user.outletId ?? undefined,
      items: dto.items,
      total: dto.total,
      promotionId: dto.promotionId,
    });
  }

  // ==================== Parameterized routes (must be LAST) ====================

  @Get(':id')
  @BusinessScoped({ resource: 'promotion', param: 'id' })
  @ApiOperation({ summary: 'Get promotion by ID' })
  async get(@Param('id') id: string) {
    const p = await this.promotionRepo.findById(id);
    if (!p) throw new NotFoundException('Promotion not found');
    return p;
  }

  @Put(':id')
  @BusinessScoped({ resource: 'promotion', param: 'id' })
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Update promotion' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.promotionRepo.update(id, dto);
  }

  @Delete(':id')
  @BusinessScoped({ resource: 'promotion', param: 'id' })
  @Roles(EmployeeRole.MANAGER, EmployeeRole.OWNER)
  @ApiOperation({ summary: 'Deactivate promotion' })
  async remove(@Param('id') id: string) {
    await this.promotionRepo.deactivate(id);
    return { message: 'Promotion deactivated' };
  }
}
