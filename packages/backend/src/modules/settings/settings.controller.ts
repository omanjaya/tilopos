import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ISettingsRepository } from '../../domain/interfaces/repositories/settings.repository';
import { UpdateTaxConfigDto } from '../../application/dtos/settings.dto';
import { UpdateReceiptTemplateDto } from '../../application/dtos/settings.dto';
import { UpdateOperatingHoursDto } from '../../application/dtos/settings.dto';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../../application/dtos/settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(REPOSITORY_TOKENS.SETTINGS)
    private readonly settingsRepo: ISettingsRepository,
  ) { }

  @Get('business')
  async getBusiness(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findBusiness(user.businessId);
  }

  @Put('business')
  async updateBusiness(@CurrentUser() user: AuthUser, @Body() dto: { name?: string; phone?: string; email?: string; address?: string; settings?: Record<string, unknown> }) {
    return this.settingsRepo.updateBusiness(user.businessId, {
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      settings: dto.settings,
    });
  }

  @Get('outlets')
  async listOutlets(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findOutlets(user.businessId);
  }

  @Post('outlets')
  async createOutlet(@Body() dto: { name: string; code?: string; address?: string; phone?: string; taxRate?: number; serviceCharge?: number }, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.createOutlet({
      businessId: user.businessId,
      name: dto.name,
      code: dto.code || null,
      address: dto.address || null,
      phone: dto.phone || null,
      taxRate: dto.taxRate,
      serviceCharge: dto.serviceCharge,
    });
  }

  @Put('outlets/:id')
  async updateOutlet(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.settingsRepo.updateOutlet(id, dto);
  }

  @Get('modifier-groups')
  async listModifierGroups(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findModifierGroups(user.businessId);
  }

  @Post('modifier-groups')
  async createModifierGroup(@Body() dto: { name: string; selectionType?: 'single' | 'multiple'; minSelection?: number; maxSelection?: number; isRequired?: boolean; modifiers: { name: string; price: number }[] }, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.createModifierGroup({
      businessId: user.businessId,
      name: dto.name,
      selectionType: dto.selectionType || 'single',
      minSelection: dto.minSelection ?? 0,
      maxSelection: dto.maxSelection || null,
      isRequired: dto.isRequired ?? false,
      modifiers: dto.modifiers,
    });
  }

  @Put('modifier-groups/:id')
  async updateModifierGroup(@Param('id') id: string, @Body() dto: { name?: string; isActive?: boolean }) {
    return this.settingsRepo.updateModifierGroup(id, {
      name: dto.name,
      isActive: dto.isActive,
    });
  }

  @Delete('modifier-groups/:id')
  async deleteModifierGroup(@Param('id') id: string) {
    await this.settingsRepo.deleteModifierGroup(id);
    return { message: 'Modifier group deactivated' };
  }

  @Get('loyalty')
  async getLoyaltyProgram(@CurrentUser() user: AuthUser) {
    const program = await this.settingsRepo.findLoyaltyProgram(user.businessId);
    const tiers = await this.settingsRepo.findLoyaltyTiers(user.businessId);
    return { program, tiers };
  }

  @Post('loyalty')
  async createLoyaltyProgram(@Body() dto: { name: string; amountPerPoint: number; redemptionRate: number; pointExpiryDays?: number }, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.createLoyaltyProgram({
      businessId: user.businessId,
      name: dto.name,
      amountPerPoint: dto.amountPerPoint,
      redemptionRate: dto.redemptionRate,
      pointExpiryDays: dto.pointExpiryDays || null,
    });
  }

  @Get('outlets/:id')
  async getOutlet(@Param('id') id: string) {
    const outlet = await this.settingsRepo.findOutletById(id);
    if (!outlet) throw new NotFoundException('Outlet not found');
    return outlet;
  }

  @Get('loyalty/tiers')
  async getLoyaltyTiers(@CurrentUser() user: AuthUser, @Query('_unused') _unused?: string) {
    return this.settingsRepo.findLoyaltyTiers(user.businessId);
  }

  @Delete('outlets/:id')
  async deleteOutlet(@Param('id') id: string) {
    await this.settingsRepo.deleteOutlet(id);
    return { message: 'Outlet deactivated' };
  }

  @Put('loyalty')
  async updateLoyaltyProgram(@Body() dto: { name?: string; amountPerPoint?: number; redemptionRate?: number; pointExpiryDays?: number; isActive?: boolean }, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.updateLoyaltyProgram(user.businessId, dto);
  }

  @Post('loyalty/tiers')
  async createLoyaltyTier(@Body() dto: { name: string; minPoints: number; minSpent?: number; pointMultiplier: number; benefits?: string[]; sortOrder?: number }, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.createLoyaltyTier({
      businessId: user.businessId,
      name: dto.name,
      minPoints: dto.minPoints,
      minSpent: dto.minSpent,
      pointMultiplier: dto.pointMultiplier,
      benefits: dto.benefits,
      sortOrder: dto.sortOrder,
    });
  }

  @Put('loyalty/tiers/:id')
  async updateLoyaltyTier(@Param('id') id: string, @Body() dto: { name?: string; minPoints?: number; minSpent?: number; pointMultiplier?: number; benefits?: string[]; sortOrder?: number; isActive?: boolean }) {
    return this.settingsRepo.updateLoyaltyTier(id, dto);
  }

  @Delete('loyalty/tiers/:id')
  async deleteLoyaltyTier(@Param('id') id: string) {
    await this.settingsRepo.deleteLoyaltyTier(id);
    return { message: 'Loyalty tier deactivated' };
  }

  // Legacy Tax Configuration (per outlet)
  @Get('outlets/:id/tax')
  async getTaxConfig(@Param('id') outletId: string) {
    return this.settingsRepo.getTaxConfig(outletId);
  }

  @Put('outlets/:id/tax')
  async updateTaxConfig(@Param('id') outletId: string, @Body() dto: { taxRate?: number; serviceCharge?: number; taxInclusive?: boolean; taxName?: string; taxNumber?: string }) {
    return this.settingsRepo.updateTaxConfig(outletId, dto);
  }

  // Legacy Receipt Template (per outlet)
  @Get('outlets/:id/receipt')
  async getReceiptTemplate(@Param('id') outletId: string) {
    return this.settingsRepo.getReceiptTemplate(outletId);
  }

  @Put('outlets/:id/receipt')
  async updateReceiptTemplate(@Param('id') outletId: string, @Body() dto: { header?: string; footer?: string; showLogo?: boolean; logoUrl?: string; showQRCode?: boolean; showTaxDetails?: boolean; showServiceCharge?: boolean; paperSize?: '58mm' | '80mm'; fontSize?: 'small' | 'medium' | 'large' }) {
    return this.settingsRepo.updateReceiptTemplate(outletId, dto);
  }

  // Legacy Operating Hours (per outlet)
  @Get('outlets/:id/hours')
  async getOperatingHours(@Param('id') outletId: string) {
    return this.settingsRepo.getOperatingHours(outletId);
  }

  @Put('outlets/:id/hours')
  async updateOperatingHours(@Param('id') outletId: string, @Body() dto: { dayOfWeek: number; isOpen: boolean; openTime?: string; closeTime?: string; breakStart?: string; breakEnd?: string }[]) {
    await this.settingsRepo.updateOperatingHours(outletId, dto);
    return { message: 'Operating hours updated' };
  }

  // Legacy Payment Methods
  @Get('payment-methods')
  async getPaymentMethods(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.getPaymentMethods(user.businessId);
  }

  @Put('payment-methods')
  async updatePaymentMethods(@CurrentUser() user: AuthUser, @Body() dto: { method: string; enabled: boolean; displayName: string; processingFee?: number; feeType?: 'percentage' | 'fixed'; minAmount?: number; maxAmount?: number; sortOrder?: number }[]) {
    await this.settingsRepo.updatePaymentMethods(user.businessId, dto);
    return { message: 'Payment methods updated' };
  }

  // ==================== Tax Configuration API (business-level) ====================

  @Get('tax')
  @ApiOperation({ summary: 'Get tax configuration for business' })
  async getBusinessTaxConfig(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.getBusinessTaxConfig(user.businessId);
  }

  @Put('tax')
  @ApiOperation({ summary: 'Update tax configuration for business' })
  async updateBusinessTaxConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaxConfigDto,
  ) {
    if (dto.taxRate !== undefined && (dto.taxRate < 0 || dto.taxRate > 100)) {
      throw new BadRequestException('taxRate must be between 0 and 100');
    }
    if (dto.serviceChargeRate !== undefined && (dto.serviceChargeRate < 0 || dto.serviceChargeRate > 100)) {
      throw new BadRequestException('serviceChargeRate must be between 0 and 100');
    }
    return this.settingsRepo.updateBusinessTaxConfig(user.businessId, {
      taxEnabled: dto.taxEnabled,
      taxRate: dto.taxRate,
      taxName: dto.taxName,
      taxInclusive: dto.taxInclusive,
      serviceChargeEnabled: dto.serviceChargeEnabled,
      serviceChargeRate: dto.serviceChargeRate,
    });
  }

  // ==================== Receipt Template API (outlet-level) ====================

  @Get('receipt')
  @ApiOperation({ summary: 'Get receipt template for current outlet' })
  async getOutletReceiptTemplate(@CurrentUser() user: AuthUser) {
    const outletId = user.outletId;
    if (!outletId) {
      throw new BadRequestException('No outlet associated with this user');
    }
    return this.settingsRepo.getOutletReceiptTemplate(outletId);
  }

  @Put('receipt')
  @ApiOperation({ summary: 'Update receipt template for current outlet' })
  async updateOutletReceiptTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateReceiptTemplateDto,
  ) {
    const outletId = user.outletId;
    if (!outletId) {
      throw new BadRequestException('No outlet associated with this user');
    }
    return this.settingsRepo.updateOutletReceiptTemplate(outletId, {
      header: dto.header,
      footer: dto.footer,
      showLogo: dto.showLogo,
      showAddress: dto.showAddress,
      showPhone: dto.showPhone,
      showTaxDetails: dto.showTaxDetails,
      showPaymentMethod: dto.showPaymentMethod,
      paperWidth: dto.paperWidth,
      customMessage: dto.customMessage,
    });
  }

  // ==================== Operating Hours API ====================

  @Get('hours/:outletId')
  @ApiOperation({ summary: 'Get operating hours for outlet' })
  async getOutletOperatingHours(@Param('outletId') outletId: string) {
    return this.settingsRepo.getOutletOperatingHours(outletId);
  }

  @Put('hours/:outletId')
  @ApiOperation({ summary: 'Update operating hours for outlet' })
  async updateOutletOperatingHours(
    @Param('outletId') outletId: string,
    @Body() dto: UpdateOperatingHoursDto,
  ) {
    const { hours } = dto;

    // Validate that all 7 days are present (0-6)
    const daysPresent = new Set(hours.map((h) => h.dayOfWeek));
    for (let i = 0; i <= 6; i++) {
      if (!daysPresent.has(i)) {
        throw new BadRequestException(`Missing entry for day ${i}`);
      }
    }

    // Validate HH:mm format for all entries
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const entry of hours) {
      if (!timeRegex.test(entry.openTime)) {
        throw new BadRequestException(`Invalid openTime format for day ${entry.dayOfWeek}: ${entry.openTime}`);
      }
      if (!timeRegex.test(entry.closeTime)) {
        throw new BadRequestException(`Invalid closeTime format for day ${entry.dayOfWeek}: ${entry.closeTime}`);
      }
    }

    return this.settingsRepo.updateOutletOperatingHours(outletId, hours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
      isClosed: h.isClosed,
    })));
  }

  // ==================== Payment Method Setup API (CRUD) ====================

  @Get('payment-methods/list')
  @ApiOperation({ summary: 'List payment methods for business (CRUD)' })
  async listBusinessPaymentMethods(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.getBusinessPaymentMethods(user.businessId);
  }

  @Post('payment-methods/create')
  @ApiOperation({ summary: 'Create a new payment method' })
  async createBusinessPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.settingsRepo.createBusinessPaymentMethod(user.businessId, {
      name: dto.name,
      type: dto.type,
      isActive: dto.isActive,
      processingFee: dto.processingFee,
      settings: dto.settings,
    });
  }

  @Put('payment-methods/:id/update')
  @ApiOperation({ summary: 'Update a payment method' })
  async updateBusinessPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.settingsRepo.updateBusinessPaymentMethod(user.businessId, id, {
      name: dto.name,
      type: dto.type,
      isActive: dto.isActive,
      processingFee: dto.processingFee,
      settings: dto.settings,
    });
  }

  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Deactivate a payment method' })
  async deleteBusinessPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.settingsRepo.deleteBusinessPaymentMethod(user.businessId, id);
    return { message: 'Payment method deactivated' };
  }
}
