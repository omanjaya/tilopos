import { Injectable } from '@nestjs/common';
import type {
  ISettingsRepository,
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
} from '../../../domain/interfaces/repositories/settings.repository';
import { BusinessSettingsRepository } from './business-settings.repository';
import { OutletSettingsRepository } from './outlet-settings.repository';
import { ModifierGroupRepository } from './modifier-group.repository';
import { LoyaltySettingsRepository } from './loyalty-settings.repository';
import { TaxConfigurationRepository } from './tax-configuration.repository';
import { ReceiptTemplateRepository } from './receipt-template.repository';
import { OperatingHoursRepository } from './operating-hours.repository';
import { PaymentMethodRepository } from './payment-method.repository';

/**
 * Main Settings Repository that delegates to specialized repositories.
 * This acts as a facade that maintains the original ISettingsRepository interface
 * while delegating to focused, single-responsibility repositories.
 */
@Injectable()
export class SettingsRepository implements ISettingsRepository {
  constructor(
    private readonly businessSettings: BusinessSettingsRepository,
    private readonly outletSettings: OutletSettingsRepository,
    private readonly modifierGroups: ModifierGroupRepository,
    private readonly loyaltySettings: LoyaltySettingsRepository,
    private readonly taxConfiguration: TaxConfigurationRepository,
    private readonly receiptTemplate: ReceiptTemplateRepository,
    private readonly operatingHours: OperatingHoursRepository,
    private readonly paymentMethods: PaymentMethodRepository,
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

  async findOutletById(id: string): Promise<OutletRecord | null> {
    return this.outletSettings.findOutletById(id);
  }

  async createOutlet(data: CreateOutletData): Promise<OutletRecord> {
    return this.outletSettings.createOutlet(data);
  }

  async updateOutlet(id: string, data: Record<string, unknown>): Promise<OutletRecord> {
    return this.outletSettings.updateOutlet(id, data);
  }

  async deleteOutlet(id: string): Promise<void> {
    return this.outletSettings.deleteOutlet(id);
  }

  // ==================== Modifier Groups ====================

  async findModifierGroups(businessId: string): Promise<ModifierGroupRecord[]> {
    return this.modifierGroups.findModifierGroups(businessId);
  }

  async createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroupRecord> {
    return this.modifierGroups.createModifierGroup(data);
  }

  async updateModifierGroup(
    id: string,
    data: UpdateModifierGroupData,
  ): Promise<ModifierGroupRecord> {
    return this.modifierGroups.updateModifierGroup(id, data);
  }

  async deleteModifierGroup(id: string): Promise<void> {
    return this.modifierGroups.deleteModifierGroup(id);
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

  async updateLoyaltyTier(id: string, data: UpdateLoyaltyTierData): Promise<LoyaltyTierRecord> {
    return this.loyaltySettings.updateLoyaltyTier(id, data);
  }

  async deleteLoyaltyTier(id: string): Promise<void> {
    return this.loyaltySettings.deleteLoyaltyTier(id);
  }

  // ==================== Tax Configuration ====================

  async getTaxConfig(outletId: string): Promise<TaxConfig> {
    return this.taxConfiguration.getTaxConfig(outletId);
  }

  async updateTaxConfig(outletId: string, data: UpdateTaxConfigData): Promise<TaxConfig> {
    return this.taxConfiguration.updateTaxConfig(outletId, data);
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

  async getReceiptTemplate(outletId: string): Promise<ReceiptTemplate> {
    return this.receiptTemplate.getReceiptTemplate(outletId);
  }

  async updateReceiptTemplate(
    outletId: string,
    data: UpdateReceiptTemplateData,
  ): Promise<ReceiptTemplate> {
    return this.receiptTemplate.updateReceiptTemplate(outletId, data);
  }

  async getOutletReceiptTemplate(outletId: string): Promise<OutletReceiptTemplate> {
    return this.receiptTemplate.getOutletReceiptTemplate(outletId);
  }

  async updateOutletReceiptTemplate(
    outletId: string,
    data: UpdateOutletReceiptTemplateData,
  ): Promise<OutletReceiptTemplate> {
    return this.receiptTemplate.updateOutletReceiptTemplate(outletId, data);
  }

  // ==================== Operating Hours ====================

  async getOperatingHours(outletId: string): Promise<OperatingHours[]> {
    return this.operatingHours.getOperatingHours(outletId);
  }

  async updateOperatingHours(outletId: string, data: OperatingHoursData[]): Promise<void> {
    return this.operatingHours.updateOperatingHours(outletId, data);
  }

  async getOutletOperatingHours(outletId: string): Promise<OutletOperatingHoursEntry[]> {
    return this.operatingHours.getOutletOperatingHours(outletId);
  }

  async updateOutletOperatingHours(
    outletId: string,
    data: OutletOperatingHoursEntry[],
  ): Promise<OutletOperatingHoursEntry[]> {
    return this.operatingHours.updateOutletOperatingHours(outletId, data);
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
}
