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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { ApplyPromotionUseCase } from '../../application/use-cases/promotions/apply-promotion.use-case';
import { ValidateVoucherUseCase } from '../../application/use-cases/promotions/validate-voucher.use-case';
import { GenerateVoucherBatchUseCase } from '../../application/use-cases/promotions/generate-voucher-batch.use-case';
import { GenerateVoucherBatchDto } from '../../application/dtos/voucher-batch.dto';
import {
  ApplyPromotionDto,
  CreatePromotionDto,
  GenerateVouchersDto,
  UpdatePromotionDto,
  UseVoucherDto,
  ValidateVoucherDto,
  VoucherListQueryDto,
} from '../../application/dtos/promotion.dto';
import { RequireFeature } from '../../common/guards/feature.guard';
import { PromotionsService } from './promotions.service';

const MANAGEMENT = [EmployeeRole.MANAGER, EmployeeRole.OWNER];
const POS_STAFF = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
];

@ApiTags('Promotions')
@ApiBearerAuth()
@RequireFeature('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly applyPromotionUseCase: ApplyPromotionUseCase,
    private readonly validateVoucherUseCase: ValidateVoucherUseCase,
    private readonly generateVoucherBatchUseCase: GenerateVoucherBatchUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active promotions for business' })
  async list(@CurrentUser() user: AuthUser) {
    return this.promotionsService.list(user.businessId);
  }

  @Post()
  @Roles(...MANAGEMENT)
  @ApiOperation({ summary: 'Create a new promotion' })
  async create(@Body() dto: CreatePromotionDto, @CurrentUser() user: AuthUser) {
    return this.promotionsService.create(user.businessId, dto);
  }

  // ==================== Voucher Endpoints (must be BEFORE :id) ====================

  @Get('vouchers')
  @Roles(...MANAGEMENT)
  @ApiOperation({ summary: 'List vouchers for business (latest 500)' })
  async listVouchers(@Query() query: VoucherListQueryDto, @CurrentUser() user: AuthUser) {
    return this.promotionsService.listVouchers(user.businessId, query.search);
  }

  @Post('vouchers/generate')
  @Roles(...MANAGEMENT)
  @ApiOperation({ summary: 'Generate vouchers with discount details' })
  async generateVouchers(@Body() dto: GenerateVouchersDto, @CurrentUser() user: AuthUser) {
    return this.promotionsService.generateVouchers(user.businessId, dto);
  }

  @Get('vouchers/export')
  @Roles(...MANAGEMENT)
  @ApiOperation({ summary: 'Export vouchers as CSV' })
  async exportVouchers(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const csv = await this.promotionsService.exportVouchersCsv(user.businessId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vouchers.csv');
    res.send(csv);
  }

  @Post('vouchers/validate')
  @Roles(...POS_STAFF)
  @ApiOperation({ summary: 'Validate voucher code (preview; checkout re-validates)' })
  async validateVoucher(@Body() dto: ValidateVoucherDto, @CurrentUser() user: AuthUser) {
    return this.validateVoucherUseCase.execute({
      code: dto.code,
      businessId: user.businessId,
      total: dto.total,
      outletId: user.outletId,
      customerId: dto.customerId ?? null,
    });
  }

  @Post('vouchers/:voucherId/use')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
  @ApiOperation({ summary: 'Mark voucher as used (single-use, conditional update)' })
  async useVoucher(
    @Param('voucherId', ParseUUIDPipe) voucherId: string,
    @Body() dto: UseVoucherDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.validateVoucherUseCase.markVoucherAsUsed(
      voucherId,
      dto.customerId ?? null,
      user.businessId,
    );
    return { message: 'Voucher marked as used' };
  }

  @Post('vouchers/batch')
  @Roles(...MANAGEMENT)
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
  @Roles(...POS_STAFF)
  @ApiOperation({ summary: 'Preview applicable promotions (prices loaded server-side)' })
  async applyPromotion(@Body() dto: ApplyPromotionDto, @CurrentUser() user: AuthUser) {
    return this.applyPromotionUseCase.execute({
      businessId: user.businessId,
      outletId: user.outletId ?? undefined,
      items: dto.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      customerId: dto.customerId,
      promotionId: dto.promotionId,
    });
  }

  // ==================== Parameterized routes (must be LAST) ====================

  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.promotionsService.findOne(user.businessId, id);
  }

  @Put(':id')
  @Roles(...MANAGEMENT)
  @ApiOperation({ summary: 'Update promotion' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.promotionsService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @Roles(...MANAGEMENT)
  @ApiOperation({ summary: 'Deactivate promotion' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.promotionsService.deactivate(user.businessId, id);
    return { message: 'Promotion deactivated' };
  }
}
