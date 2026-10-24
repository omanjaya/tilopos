import { EmailService } from '@infrastructure/notifications/email/email.service';
import { reportScheduleView } from './report-schedule.view';
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseArrayPipe,
  ParseUUIDPipe,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { OutletAccessGuard } from '../../shared/guards/outlet-access.guard';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { SettingsRepository } from '../../infrastructure/repositories/settings/settings.repository';
import {
  UpdateOutletDto,
  UpdateTaxConfigDto,
  UpdateReceiptTemplateDto,
  UpdateOperatingHoursDto,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreatePrinterConfigDto,
  UpdatePrinterConfigDto,
  CreateReportScheduleDto,
  UpdateReportScheduleDto,
  UpdateBusinessDto,
  CreateOutletDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateLoyaltyProgramDto,
  UpdateLoyaltyProgramDto,
  CreateLoyaltyTierDto,
  UpdateLoyaltyTierDto,
  UpdateOutletTaxDto,
  UpdateLegacyReceiptTemplateDto,
  LegacyOperatingHoursEntryDto,
  LegacyPaymentMethodConfigDto,
  EDITABLE_BUSINESS_SETTINGS,
} from '../../application/dtos/settings.dto';
import { OutletQueryDto } from '../../application/dtos/transaction.dto';
import {
  toPosPaymentMethods,
  type PosPaymentMethodView,
  type PosReceiptTemplateView,
} from './pos-settings.view';

/** Roles that run the POS (and may read its payment/receipt configuration). */
const POS_READERS = [
  EmployeeRole.OWNER,
  EmployeeRole.MANAGER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.CASHIER,
] as const;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Array bodies are not validated by the global ValidationPipe; validate each item explicitly. */
const arrayOf = <T>(items: new () => T) =>
  new ParseArrayPipe({
    items,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });

/**
 * Picks the display settings a client may change via PUT /settings/business.
 * Everything else in business.settings is owned by dedicated endpoints.
 */
function pickEditableBusinessSettings(
  settings: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!settings) return undefined;
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_BUSINESS_SETTINGS) {
    if (settings[key] === undefined) continue;
    const value = settings[key];
    if (key === 'brandColor' && !(typeof value === 'string' && HEX_COLOR.test(value))) {
      throw new BadRequestException('settings.brandColor must be a #RRGGBB hex color');
    }
    patch[key] = value;
  }
  return patch;
}

@ApiTags('Settings')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(REPOSITORY_TOKENS.SETTINGS)
    private readonly settingsRepo: SettingsRepository,
    private readonly tenant: TenantAccessService,
    private readonly email: EmailService,
  ) {}

  // ==================== Business profile (owner only) ====================

  @Get('business')
  async getBusiness(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findBusiness(user.businessId);
  }

  @Put('business')
  @Roles(EmployeeRole.OWNER)
  async updateBusiness(@CurrentUser() user: AuthUser, @Body() dto: UpdateBusinessDto) {
    return this.settingsRepo.updateBusiness(user.businessId, {
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      settings: pickEditableBusinessSettings(dto.settings),
    });
  }

  // ==================== Outlets ====================

  @Get('outlets')
  async listOutlets(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findOutlets(user.businessId);
  }

  @Post('outlets')
  @Roles(EmployeeRole.OWNER)
  async createOutlet(@Body() dto: CreateOutletDto, @CurrentUser() user: AuthUser) {
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

  @Get('outlets/:id')
  async getOutlet(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const outlet = await this.settingsRepo.findOutletById(user.businessId, id);
    if (!outlet) throw new NotFoundException('Outlet not found');
    return outlet;
  }

  @Put('outlets/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateOutlet(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOutletDto,
  ) {
    OutletAccessGuard.enforceOutletAccess(user, id, 'outlet');
    if (dto.isActive !== undefined && user.role !== EmployeeRole.OWNER) {
      throw new BadRequestException('Only the owner can activate or deactivate outlets');
    }
    return this.settingsRepo.updateOutlet(user.businessId, id, {
      name: dto.name,
      code: dto.code,
      address: dto.address,
      phone: dto.phone,
      taxRate: dto.taxRate,
      serviceCharge: dto.serviceCharge,
      isActive: dto.isActive,
    });
  }

  @Delete('outlets/:id')
  @Roles(EmployeeRole.OWNER)
  async deleteOutlet(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.settingsRepo.deleteOutlet(user.businessId, id);
    return { message: 'Outlet deactivated' };
  }

  // ==================== Modifier groups ====================

  @Get('modifier-groups')
  async listModifierGroups(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findModifierGroups(user.businessId);
  }

  @Post('modifier-groups')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async createModifierGroup(@Body() dto: CreateModifierGroupDto, @CurrentUser() user: AuthUser) {
    const minSelection = dto.minSelection ?? 0;
    const maxSelection = dto.maxSelection ?? null;
    if (maxSelection !== null && minSelection > maxSelection) {
      throw new BadRequestException('minSelection cannot be greater than maxSelection');
    }
    return this.settingsRepo.createModifierGroup({
      businessId: user.businessId,
      name: dto.name,
      selectionType: dto.selectionType || 'single',
      minSelection,
      maxSelection,
      isRequired: dto.isRequired ?? false,
      modifiers: dto.modifiers.map((m) => ({ name: m.name, price: m.price })),
    });
  }

  @Put('modifier-groups/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateModifierGroup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.settingsRepo.updateModifierGroup(user.businessId, id, {
      name: dto.name,
      isActive: dto.isActive,
      selectionType: dto.selectionType,
      minSelection: dto.minSelection,
      maxSelection: dto.maxSelection,
      isRequired: dto.isRequired,
      modifiers: dto.modifiers?.map((m) => ({ id: m.id, name: m.name, price: m.price })),
    });
  }

  @Delete('modifier-groups/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async deleteModifierGroup(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.settingsRepo.deleteModifierGroup(user.businessId, id);
    return { message: 'Modifier group deactivated' };
  }

  // ==================== Loyalty ====================

  @Get('loyalty')
  async getLoyaltyProgram(@CurrentUser() user: AuthUser) {
    const program = await this.settingsRepo.findLoyaltyProgram(user.businessId);
    const tiers = await this.settingsRepo.findLoyaltyTiers(user.businessId);
    return { program, tiers };
  }

  @Post('loyalty')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async createLoyaltyProgram(@Body() dto: CreateLoyaltyProgramDto, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.createLoyaltyProgram({
      businessId: user.businessId,
      name: dto.name,
      amountPerPoint: dto.amountPerPoint,
      redemptionRate: dto.redemptionRate,
      pointExpiryDays: dto.pointExpiryDays || null,
    });
  }

  @Put('loyalty')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateLoyaltyProgram(@Body() dto: UpdateLoyaltyProgramDto, @CurrentUser() user: AuthUser) {
    return this.settingsRepo.updateLoyaltyProgram(user.businessId, {
      name: dto.name,
      amountPerPoint: dto.amountPerPoint,
      redemptionRate: dto.redemptionRate,
      pointExpiryDays: dto.pointExpiryDays,
      isActive: dto.isActive,
    });
  }

  @Get('loyalty/tiers')
  async getLoyaltyTiers(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.findLoyaltyTiers(user.businessId);
  }

  @Post('loyalty/tiers')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async createLoyaltyTier(@Body() dto: CreateLoyaltyTierDto, @CurrentUser() user: AuthUser) {
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
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateLoyaltyTier(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLoyaltyTierDto,
  ) {
    return this.settingsRepo.updateLoyaltyTier(user.businessId, id, {
      name: dto.name,
      minPoints: dto.minPoints,
      minSpent: dto.minSpent,
      pointMultiplier: dto.pointMultiplier,
      benefits: dto.benefits,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
  }

  @Delete('loyalty/tiers/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async deleteLoyaltyTier(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.settingsRepo.deleteLoyaltyTier(user.businessId, id);
    return { message: 'Loyalty tier deactivated' };
  }

  // ==================== Legacy per-outlet tax / receipt / hours ====================

  /** Read by the POS for every front-of-house role to compute cart totals. */
  @Get('outlets/:id/tax')
  @Roles(
    EmployeeRole.OWNER,
    EmployeeRole.MANAGER,
    EmployeeRole.SUPERVISOR,
    EmployeeRole.CASHIER,
    EmployeeRole.KITCHEN,
    EmployeeRole.INVENTORY,
  )
  async getTaxConfig(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) outletId: string) {
    return this.settingsRepo.getTaxConfig(user.businessId, outletId);
  }

  @Put('outlets/:id/tax')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateTaxConfig(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) outletId: string,
    @Body() dto: UpdateOutletTaxDto,
  ) {
    OutletAccessGuard.enforceOutletAccess(user, outletId, 'outlet');
    return this.settingsRepo.updateTaxConfig(user.businessId, outletId, {
      taxRate: dto.taxRate,
      serviceCharge: dto.serviceCharge,
      taxInclusive: dto.taxInclusive,
      taxName: dto.taxName,
      taxNumber: dto.taxNumber,
    });
  }

  @Get('outlets/:id/receipt')
  async getReceiptTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) outletId: string,
  ) {
    return this.settingsRepo.getReceiptTemplate(user.businessId, outletId);
  }

  @Put('outlets/:id/receipt')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateReceiptTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) outletId: string,
    @Body() dto: UpdateLegacyReceiptTemplateDto,
  ) {
    OutletAccessGuard.enforceOutletAccess(user, outletId, 'outlet');
    return this.settingsRepo.updateReceiptTemplate(user.businessId, outletId, {
      header: dto.header,
      footer: dto.footer,
      showLogo: dto.showLogo,
      logoUrl: dto.logoUrl,
      showQRCode: dto.showQRCode,
      showTaxDetails: dto.showTaxDetails,
      showServiceCharge: dto.showServiceCharge,
      paperSize: dto.paperSize,
      fontSize: dto.fontSize,
    });
  }

  @Get('outlets/:id/hours')
  async getOperatingHours(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) outletId: string,
  ) {
    return this.settingsRepo.getOperatingHours(user.businessId, outletId);
  }

  @Put('outlets/:id/hours')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updateOperatingHours(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) outletId: string,
    @Body(arrayOf(LegacyOperatingHoursEntryDto)) dto: LegacyOperatingHoursEntryDto[],
  ) {
    if (dto.length > 7 || new Set(dto.map((h) => h.dayOfWeek)).size !== dto.length) {
      throw new BadRequestException('At most one entry per day of week');
    }
    OutletAccessGuard.enforceOutletAccess(user, outletId, 'outlet');
    await this.settingsRepo.updateOperatingHours(user.businessId, outletId, dto);
    return { message: 'Operating hours updated' };
  }

  // Legacy Payment Methods
  @Get('payment-methods')
  async getPaymentMethods(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.getPaymentMethods(user.businessId);
  }

  @Put('payment-methods')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  async updatePaymentMethods(
    @CurrentUser() user: AuthUser,
    @Body(arrayOf(LegacyPaymentMethodConfigDto)) dto: LegacyPaymentMethodConfigDto[],
  ) {
    if (dto.length > 50) {
      throw new BadRequestException('Too many payment methods');
    }
    for (const m of dto) {
      if (m.feeType !== 'fixed' && m.processingFee !== undefined && m.processingFee > 100) {
        throw new BadRequestException(`processingFee for ${m.method} must be at most 100%`);
      }
    }
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
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update tax configuration for business' })
  async updateBusinessTaxConfig(@CurrentUser() user: AuthUser, @Body() dto: UpdateTaxConfigDto) {
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
  async getOutletReceiptTemplate(@CurrentUser() user: AuthUser, @Query() query: OutletQueryDto) {
    const outletId = await this.resolveOutlet(user, query.outletId);
    return this.settingsRepo.getOutletReceiptTemplate(user.businessId, outletId);
  }

  @Put('receipt')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update receipt template for current outlet' })
  async updateOutletReceiptTemplate(
    @CurrentUser() user: AuthUser,
    @Query() query: OutletQueryDto,
    @Body() dto: UpdateReceiptTemplateDto,
  ) {
    const outletId = await this.resolveOutlet(user, query.outletId);
    return this.settingsRepo.updateOutletReceiptTemplate(user.businessId, outletId, {
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
  async getOutletOperatingHours(
    @CurrentUser() user: AuthUser,
    @Param('outletId', ParseUUIDPipe) outletId: string,
  ) {
    return this.settingsRepo.getOutletOperatingHours(user.businessId, outletId);
  }

  @Put('hours/:outletId')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update operating hours for outlet' })
  async updateOutletOperatingHours(
    @CurrentUser() user: AuthUser,
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Body() dto: UpdateOperatingHoursDto,
  ) {
    const { hours } = dto;

    // Validate that all 7 days are present (0-6); HH:mm format is validated by the DTO
    const daysPresent = new Set(hours.map((h) => h.dayOfWeek));
    for (let i = 0; i <= 6; i++) {
      if (!daysPresent.has(i)) {
        throw new BadRequestException(`Missing entry for day ${i}`);
      }
    }

    OutletAccessGuard.enforceOutletAccess(user, outletId, 'outlet');
    return this.settingsRepo.updateOutletOperatingHours(
      user.businessId,
      outletId,
      hours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
    );
  }

  // ==================== POS read-only views (front-of-house) ====================

  @Get('pos/payment-methods')
  @Roles(...POS_READERS)
  @ApiOperation({ summary: 'Active payment methods for the POS (read-only, no gateway settings)' })
  async getPosPaymentMethods(@CurrentUser() user: AuthUser): Promise<PosPaymentMethodView[]> {
    return toPosPaymentMethods(await this.settingsRepo.getBusinessPaymentMethods(user.businessId));
  }

  @Get('pos/receipt')
  @Roles(...POS_READERS)
  @ApiOperation({ summary: 'Receipt template of an accessible outlet for the POS (read-only)' })
  async getPosReceiptTemplate(
    @CurrentUser() user: AuthUser,
    @Query() query: OutletQueryDto,
  ): Promise<PosReceiptTemplateView> {
    const outletId = await this.resolveOutlet(user, query.outletId);
    return this.settingsRepo.getOutletReceiptTemplate(user.businessId, outletId);
  }

  // ==================== Payment Method Setup API (CRUD) ====================

  @Get('payment-methods/list')
  @ApiOperation({ summary: 'List payment methods for business (CRUD)' })
  async listBusinessPaymentMethods(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.getBusinessPaymentMethods(user.businessId);
  }

  @Post('payment-methods/create')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
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
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
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
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate a payment method' })
  async deleteBusinessPaymentMethod(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.settingsRepo.deleteBusinessPaymentMethod(user.businessId, id);
    return { message: 'Payment method deactivated' };
  }

  // ==================== Printer Configuration API ====================

  @Get('printers')
  @ApiOperation({ summary: 'List printer configs for business' })
  async listPrinterConfigs(@CurrentUser() user: AuthUser) {
    return this.settingsRepo.getPrinterConfigs(user.businessId);
  }

  @Post('printers')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Create a new printer config' })
  async createPrinterConfig(@CurrentUser() user: AuthUser, @Body() dto: CreatePrinterConfigDto) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId);
    return this.settingsRepo.createPrinterConfig(user.businessId, {
      name: dto.name,
      type: dto.type,
      connection: dto.connection,
      ipAddress: dto.ipAddress,
      port: dto.port,
      autoPrint: dto.autoPrint,
      copies: dto.copies,
      outletId,
    });
  }

  @Put('printers/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update a printer config' })
  async updatePrinterConfig(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePrinterConfigDto,
  ) {
    if (dto.outletId !== undefined) {
      await this.tenant.assertOutlet(user, dto.outletId);
    }
    return this.settingsRepo.updatePrinterConfig(user.businessId, id, {
      name: dto.name,
      type: dto.type,
      connection: dto.connection,
      ipAddress: dto.ipAddress,
      port: dto.port,
      isActive: dto.isActive,
      autoPrint: dto.autoPrint,
      copies: dto.copies,
      outletId: dto.outletId,
    });
  }

  @Delete('printers/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Delete a printer config' })
  async deletePrinterConfig(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.settingsRepo.deletePrinterConfig(user.businessId, id);
    return { message: 'Printer config deleted' };
  }

  // ==================== Report Schedule API ====================

  @Get('report-schedules')
  @ApiOperation({ summary: 'List report schedules for business' })
  async listReportSchedules(@CurrentUser() user: AuthUser) {
    return (await this.settingsRepo.getReportSchedules(user.businessId)).map((schedule) =>
      reportScheduleView(schedule, this.email.isConfigured()),
    );
  }

  @Post('report-schedules')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Create a new report schedule' })
  async createReportSchedule(@CurrentUser() user: AuthUser, @Body() dto: CreateReportScheduleDto) {
    return reportScheduleView(
      await this.settingsRepo.createReportSchedule(user.businessId, {
        reportType: dto.reportType,
        frequency: dto.frequency,
        recipients: dto.recipients,
        isActive: dto.isActive,
      }),
      this.email.isConfigured(),
    );
  }

  @Put('report-schedules/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update a report schedule' })
  async updateReportSchedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReportScheduleDto,
  ) {
    return reportScheduleView(
      await this.settingsRepo.updateReportSchedule(user.businessId, id, {
        reportType: dto.reportType,
        frequency: dto.frequency,
        recipients: dto.recipients,
        isActive: dto.isActive,
      }),
      this.email.isConfigured(),
    );
  }

  @Delete('report-schedules/:id')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Delete a report schedule' })
  async deleteReportSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.settingsRepo.deleteReportSchedule(user.businessId, id);
    return { message: 'Report schedule deleted' };
  }

  /** ?outletId= (validated against the caller's business/outlet access) or the caller's own outlet. */
  private async resolveOutlet(user: AuthUser, outletId?: string): Promise<string> {
    if (outletId) {
      return this.tenant.assertOutlet(user, outletId);
    }
    return this.requireOutlet(user);
  }

  private requireOutlet(user: AuthUser): string {
    if (!user.outletId) {
      throw new BadRequestException('No outlet associated with this user');
    }
    return user.outletId;
  }
}
