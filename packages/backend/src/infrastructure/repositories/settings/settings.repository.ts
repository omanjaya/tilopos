import { Injectable } from '@nestjs/common';
import type {
  BusinessRecord,
  UpdateBusinessData,
  OutletRecord,
  CreateOutletData,
  ModifierGroupRecord,
  CreateModifierGroupData,
  UpdateModifierGroupData,
  LoyaltyProgramRecord,
  CreateLoyaltyProgramData,
  UpdateLoyaltyProgramData,
  LoyaltyTierRecord,
  CreateLoyaltyTierData,
  UpdateLoyaltyTierData,
  TaxConfig,
  UpdateTaxConfigData,
  BusinessTaxConfig,
  UpdateBusinessTaxConfigData,
  ReceiptTemplate,
  UpdateReceiptTemplateData,
  OutletReceiptTemplate,
  UpdateOutletReceiptTemplateData,
  OperatingHours,
  OperatingHoursData,
  OutletOperatingHoursEntry,
  PaymentMethodConfig,
  BusinessPaymentMethod,
  CreateBusinessPaymentMethodData,
  UpdateBusinessPaymentMethodData,
  PrinterConfigRecord,
  CreatePrinterConfigInput,
  UpdatePrinterConfigInput,
  ReportScheduleRecord,
  CreateReportScheduleInput,
  UpdateReportScheduleInput,
} from '../../../domain/interfaces/repositories/settings.repository';
import { BusinessSettingsRepository } from './business-settings.repository';
import { OutletSettingsRepository } from './outlet-settings.repository';
import { ModifierGroupRepository } from './modifier-group.repository';
import { LoyaltySettingsRepository } from './loyalty-settings.repository';
import { TaxConfigurationRepository } from './tax-configuration.repository';
import { ReceiptTemplateRepository } from './receipt-template.repository';
import { OperatingHoursRepository } from './operating-hours.repository';
import { PaymentMethodRepository } from './payment-method.repository';
import { PrinterConfigRepository } from './printer-config.repository';
import { ReportScheduleRepository } from './report-schedule.repository';
import type { UpdateOutletData } from './outlet-settings.repository';

/**
 * Main Settings Repository that delegates to specialized repositories.
 * Every method is scoped by the caller's businessId (from the JWT).
 * This acts as a facade that maintains the original ISettingsRepository interface
 * while delegating to focused, single-responsibility repositories.
 */
@Injectable()
export class SettingsRepository {
  constructor(
    private readonly businessSettings: BusinessSettingsRepository,
    private readonly outletSettings: OutletSettingsRepository,
    private readonly modifierGroups: ModifierGroupRepository,
    private readonly loyaltySettings: LoyaltySettingsRepository,
    private readonly taxConfiguration: TaxConfigurationRepository,
    private readonly receiptTemplate: ReceiptTemplateRepository,
    private readonly operatingHours: OperatingHoursRepository,
    private readonly paymentMethods: PaymentMethodRepository,
    private readonly printerConfigs: PrinterConfigRepository,
    private readonly reportSchedules: ReportScheduleRepository,
  ) {}

  // ==================== Business Settings ====================

  async findBusiness(businessId: string): Promise<BusinessRecord> {
    return this.businessSettings.findBusiness(businessId);
  }

  async updateBusiness(businessId: string, data: UpdateBusinessData): Promise<BusinessRecord> {
    return this.businessSettings.updateBusiness(businessId, data);
  }

  // ==================== Outlet Settings ====================

  async findOutlets(businessId: string): Promise<OutletRecord[]> {
    return this.outletSettings.findOutlets(businessId);
  }

  async findOutletById(businessId: string, id: string): Promise<OutletRecord | null> {
    return this.outletSettings.findOutletById(businessId, id);
  }

  async createOutlet(data: CreateOutletData): Promise<OutletRecord> {
    return this.outletSettings.createOutlet(data);
  }

  async updateOutlet(
    businessId: string,
    id: string,
    data: UpdateOutletData,
  ): Promise<OutletRecord> {
    return this.outletSettings.updateOutlet(businessId, id, data);
  }

  async deleteOutlet(businessId: string, id: string): Promise<void> {
    return this.outletSettings.deleteOutlet(businessId, id);
  }

  // ==================== Modifier Groups ====================

  async findModifierGroups(businessId: string): Promise<ModifierGroupRecord[]> {
    return this.modifierGroups.findModifierGroups(businessId);
  }

  async createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroupRecord> {
    return this.modifierGroups.createModifierGroup(data);
  }

  async updateModifierGroup(
    businessId: string,
    id: string,
    data: UpdateModifierGroupData,
  ): Promise<ModifierGroupRecord> {
    return this.modifierGroups.updateModifierGroup(businessId, id, data);
  }

  async deleteModifierGroup(businessId: string, id: string): Promise<void> {
    return this.modifierGroups.deleteModifierGroup(businessId, id);
  }

  // ==================== Loyalty Program ====================

  async findLoyaltyProgram(businessId: string): Promise<LoyaltyProgramRecord | null> {
    return this.loyaltySettings.findLoyaltyProgram(businessId);
  }

  async createLoyaltyProgram(data: CreateLoyaltyProgramData): Promise<LoyaltyProgramRecord> {
    return this.loyaltySettings.createLoyaltyProgram(data);
  }

  async updateLoyaltyProgram(
    businessId: string,
    data: UpdateLoyaltyProgramData,
  ): Promise<LoyaltyProgramRecord> {
    return this.loyaltySettings.updateLoyaltyProgram(businessId, data);
  }

  // ==================== Loyalty Tiers ====================

  async findLoyaltyTiers(businessId: string): Promise<LoyaltyTierRecord[]> {
    return this.loyaltySettings.findLoyaltyTiers(businessId);
  }

  async createLoyaltyTier(data: CreateLoyaltyTierData): Promise<LoyaltyTierRecord> {
    return this.loyaltySettings.createLoyaltyTier(data);
  }

  async updateLoyaltyTier(
    businessId: string,
    id: string,
    data: UpdateLoyaltyTierData,
  ): Promise<LoyaltyTierRecord> {
    return this.loyaltySettings.updateLoyaltyTier(businessId, id, data);
  }

  async deleteLoyaltyTier(businessId: string, id: string): Promise<void> {
    return this.loyaltySettings.deleteLoyaltyTier(businessId, id);
  }

  // ==================== Tax Configuration ====================

  async getTaxConfig(businessId: string, outletId: string): Promise<TaxConfig> {
    return this.taxConfiguration.getTaxConfig(businessId, outletId);
  }

  async updateTaxConfig(
    businessId: string,
    outletId: string,
    data: UpdateTaxConfigData,
  ): Promise<TaxConfig> {
    return this.taxConfiguration.updateTaxConfig(businessId, outletId, data);
  }

  async getBusinessTaxConfig(businessId: string): Promise<BusinessTaxConfig> {
    return this.taxConfiguration.getBusinessTaxConfig(businessId);
  }

  async updateBusinessTaxConfig(
    businessId: string,
    data: UpdateBusinessTaxConfigData,
  ): Promise<BusinessTaxConfig> {
    return this.taxConfiguration.updateBusinessTaxConfig(businessId, data);
  }

  // ==================== Receipt Template ====================

  async getReceiptTemplate(businessId: string, outletId: string): Promise<ReceiptTemplate> {
    return this.receiptTemplate.getReceiptTemplate(businessId, outletId);
  }

  async updateReceiptTemplate(
    businessId: string,
    outletId: string,
    data: UpdateReceiptTemplateData,
  ): Promise<ReceiptTemplate> {
    return this.receiptTemplate.updateReceiptTemplate(businessId, outletId, data);
  }

  async getOutletReceiptTemplate(
    businessId: string,
    outletId: string,
  ): Promise<OutletReceiptTemplate> {
    return this.receiptTemplate.getOutletReceiptTemplate(businessId, outletId);
  }

  async updateOutletReceiptTemplate(
    businessId: string,
    outletId: string,
    data: UpdateOutletReceiptTemplateData,
  ): Promise<OutletReceiptTemplate> {
    return this.receiptTemplate.updateOutletReceiptTemplate(businessId, outletId, data);
  }

  // ==================== Operating Hours ====================

  async getOperatingHours(businessId: string, outletId: string): Promise<OperatingHours[]> {
    return this.operatingHours.getOperatingHours(businessId, outletId);
  }

  async updateOperatingHours(
    businessId: string,
    outletId: string,
    data: OperatingHoursData[],
  ): Promise<void> {
    return this.operatingHours.updateOperatingHours(businessId, outletId, data);
  }

  async getOutletOperatingHours(
    businessId: string,
    outletId: string,
  ): Promise<OutletOperatingHoursEntry[]> {
    return this.operatingHours.getOutletOperatingHours(businessId, outletId);
  }

  async updateOutletOperatingHours(
    businessId: string,
    outletId: string,
    data: OutletOperatingHoursEntry[],
  ): Promise<OutletOperatingHoursEntry[]> {
    return this.operatingHours.updateOutletOperatingHours(businessId, outletId, data);
  }

  // ==================== Payment Methods ====================

  async getPaymentMethods(businessId: string): Promise<PaymentMethodConfig[]> {
    return this.paymentMethods.getPaymentMethods(businessId);
  }

  async updatePaymentMethods(businessId: string, data: PaymentMethodConfig[]): Promise<void> {
    return this.paymentMethods.updatePaymentMethods(businessId, data);
  }

  async getBusinessPaymentMethods(businessId: string): Promise<BusinessPaymentMethod[]> {
    return this.paymentMethods.getBusinessPaymentMethods(businessId);
  }

  async createBusinessPaymentMethod(
    businessId: string,
    data: CreateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    return this.paymentMethods.createBusinessPaymentMethod(businessId, data);
  }

  async updateBusinessPaymentMethod(
    businessId: string,
    id: string,
    data: UpdateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    return this.paymentMethods.updateBusinessPaymentMethod(businessId, id, data);
  }

  async deleteBusinessPaymentMethod(businessId: string, id: string): Promise<void> {
    return this.paymentMethods.deleteBusinessPaymentMethod(businessId, id);
  }

  // ==================== Printer Configs ====================

  async getPrinterConfigs(businessId: string): Promise<PrinterConfigRecord[]> {
    return this.printerConfigs.getPrinterConfigs(businessId);
  }

  async createPrinterConfig(
    businessId: string,
    data: CreatePrinterConfigInput,
  ): Promise<PrinterConfigRecord> {
    return this.printerConfigs.createPrinterConfig(businessId, data);
  }

  async updatePrinterConfig(
    businessId: string,
    id: string,
    data: UpdatePrinterConfigInput,
  ): Promise<PrinterConfigRecord> {
    return this.printerConfigs.updatePrinterConfig(businessId, id, data);
  }

  async deletePrinterConfig(businessId: string, id: string): Promise<void> {
    return this.printerConfigs.deletePrinterConfig(businessId, id);
  }

  // ==================== Report Schedules ====================

  async getReportSchedules(businessId: string): Promise<ReportScheduleRecord[]> {
    return this.reportSchedules.getReportSchedules(businessId);
  }

  async createReportSchedule(
    businessId: string,
    data: CreateReportScheduleInput,
  ): Promise<ReportScheduleRecord> {
    return this.reportSchedules.createReportSchedule(businessId, data);
  }

  async updateReportSchedule(
    businessId: string,
    id: string,
    data: UpdateReportScheduleInput,
  ): Promise<ReportScheduleRecord> {
    return this.reportSchedules.updateReportSchedule(businessId, id, data);
  }

  async deleteReportSchedule(businessId: string, id: string): Promise<void> {
    return this.reportSchedules.deleteReportSchedule(businessId, id);
  }
}
