import { Injectable, NotFoundException } from '@nestjs/common';
import { ModifierSelectionType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import type {
  ISettingsRepository,
  UpdateBusinessData,
  CreateOutletData,
  CreateModifierGroupData,
  UpdateModifierGroupData,
  CreateLoyaltyProgramData,
  UpdateLoyaltyProgramData,
  CreateLoyaltyTierData,
  UpdateLoyaltyTierData,
  TaxConfig,
  UpdateTaxConfigData,
  ReceiptTemplate,
  UpdateReceiptTemplateData,
  OperatingHours,
  OperatingHoursData,
  PaymentMethodConfig,
  BusinessTaxConfig,
  UpdateBusinessTaxConfigData,
  OutletReceiptTemplate,
  UpdateOutletReceiptTemplateData,
  OutletOperatingHoursEntry,
  BusinessPaymentMethod,
  CreateBusinessPaymentMethodData,
  UpdateBusinessPaymentMethodData,
  BusinessRecord,
  OutletRecord,
  ModifierGroupRecord,
  LoyaltyProgramRecord,
  LoyaltyTierRecord,
} from '../../domain/interfaces/repositories/settings.repository';

@Injectable()
export class PrismaSettingsRepository implements ISettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBusiness(businessId: string): Promise<BusinessRecord> {
    return this.prisma.business.findUnique({ where: { id: businessId } });
  }

  async updateBusiness(businessId: string, data: UpdateBusinessData): Promise<BusinessRecord> {
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.settings !== undefined && { settings: data.settings as never }),
      },
    });
  }

  async findOutlets(businessId: string): Promise<OutletRecord[]> {
    return this.prisma.outlet.findMany({ where: { businessId } });
  }

  async findOutletById(id: string): Promise<OutletRecord | null> {
    return this.prisma.outlet.findUnique({ where: { id } });
  }

  async createOutlet(data: CreateOutletData): Promise<OutletRecord> {
    return this.prisma.outlet.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        code: data.code || null,
        address: data.address || null,
        phone: data.phone || null,
        taxRate: data.taxRate ?? 11,
        serviceCharge: data.serviceCharge ?? 0,
      },
    });
  }

  async updateOutlet(id: string, data: Record<string, unknown>): Promise<OutletRecord> {
    return this.prisma.outlet.update({
      where: { id },
      data: data as Record<string, never>,
    });
  }

  async findModifierGroups(businessId: string): Promise<ModifierGroupRecord[]> {
    return this.prisma.modifierGroup.findMany({
      where: { businessId, isActive: true },
      include: { modifiers: true },
    });
  }

  async createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroupRecord> {
    return this.prisma.modifierGroup.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        selectionType: data.selectionType as ModifierSelectionType,
        minSelection: data.minSelection,
        maxSelection: data.maxSelection,
        isRequired: data.isRequired,
        modifiers: { create: data.modifiers },
      },
    });
  }

  async updateModifierGroup(
    id: string,
    data: UpdateModifierGroupData,
  ): Promise<ModifierGroupRecord> {
    return this.prisma.modifierGroup.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteModifierGroup(id: string): Promise<void> {
    await this.prisma.modifierGroup.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findLoyaltyProgram(businessId: string): Promise<LoyaltyProgramRecord | null> {
    return this.prisma.loyaltyProgram.findFirst({ where: { businessId } });
  }

  async createLoyaltyProgram(data: CreateLoyaltyProgramData): Promise<LoyaltyProgramRecord> {
    return this.prisma.loyaltyProgram.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        amountPerPoint: data.amountPerPoint,
        redemptionRate: data.redemptionRate,
        pointExpiryDays: data.pointExpiryDays || null,
      },
    });
  }

  async findLoyaltyTiers(businessId: string): Promise<LoyaltyTierRecord[]> {
    return this.prisma.loyaltyTier.findMany({
      where: { businessId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteOutlet(id: string): Promise<void> {
    await this.prisma.outlet.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updateLoyaltyProgram(
    businessId: string,
    data: UpdateLoyaltyProgramData,
  ): Promise<LoyaltyProgramRecord> {
    return this.prisma.loyaltyProgram.updateMany({
      where: { businessId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amountPerPoint !== undefined && { amountPerPoint: data.amountPerPoint }),
        ...(data.redemptionRate !== undefined && { redemptionRate: data.redemptionRate }),
        ...(data.pointExpiryDays !== undefined && { pointExpiryDays: data.pointExpiryDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async createLoyaltyTier(data: CreateLoyaltyTierData): Promise<LoyaltyTierRecord> {
    return this.prisma.loyaltyTier.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        minPoints: data.minPoints,
        minSpent: data.minSpent ?? 0,
        pointMultiplier: data.pointMultiplier,
        benefits: (data.benefits || []) as never,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateLoyaltyTier(id: string, data: UpdateLoyaltyTierData): Promise<LoyaltyTierRecord> {
    return this.prisma.loyaltyTier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.minPoints !== undefined && { minPoints: data.minPoints }),
        ...(data.minSpent !== undefined && { minSpent: data.minSpent }),
        ...(data.pointMultiplier !== undefined && { pointMultiplier: data.pointMultiplier }),
        ...(data.benefits !== undefined && { benefits: data.benefits as never }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteLoyaltyTier(id: string): Promise<void> {
    await this.prisma.loyaltyTier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Tax Configuration - stored in outlet settings JSON
  async getTaxConfig(outletId: string): Promise<TaxConfig> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true, taxRate: true, serviceCharge: true, settings: true },
    });
    if (!outlet) {
      return {
        outletId,
        taxRate: 11,
        serviceCharge: 0,
        taxInclusive: false,
        taxName: 'PPN',
      };
    }
    const settings = (outlet.settings as Record<string, unknown>) || {};
    return {
      outletId,
      taxRate: Number(outlet.taxRate),
      serviceCharge: Number(outlet.serviceCharge),
      taxInclusive: Boolean(settings.taxInclusive),
      taxName: (settings.taxName as string) || 'PPN',
      taxNumber: settings.taxNumber as string | undefined,
    };
  }

  async updateTaxConfig(outletId: string, data: UpdateTaxConfigData): Promise<TaxConfig> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });
    const currentSettings = (outlet?.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      ...(data.taxInclusive !== undefined && { taxInclusive: data.taxInclusive }),
      ...(data.taxName !== undefined && { taxName: data.taxName }),
      ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber }),
    };
    return this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.serviceCharge !== undefined && { serviceCharge: data.serviceCharge }),
        settings: updatedSettings as never,
      },
    });
  }

  // Receipt Template - stored in outlet settings JSON
  async getReceiptTemplate(outletId: string): Promise<ReceiptTemplate> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { receiptHeader: true, receiptFooter: true, settings: true },
    });
    if (!outlet) {
      return {
        outletId,
        header: '',
        footer: '',
        showLogo: true,
        showQRCode: false,
        showTaxDetails: true,
        showServiceCharge: true,
        paperSize: '80mm',
        fontSize: 'medium',
      };
    }
    const settings = (outlet.settings as Record<string, unknown>) || {};
    return {
      outletId,
      header: outlet.receiptHeader || '',
      footer: outlet.receiptFooter || '',
      showLogo: Boolean(settings.showLogo ?? true),
      logoUrl: settings.logoUrl as string | undefined,
      showQRCode: Boolean(settings.showQRCode),
      showTaxDetails: Boolean(settings.showTaxDetails ?? true),
      showServiceCharge: Boolean(settings.showServiceCharge ?? true),
      paperSize: (settings.paperSize as '58mm' | '80mm') || '80mm',
      fontSize: (settings.fontSize as 'small' | 'medium' | 'large') || 'medium',
    };
  }

  async updateReceiptTemplate(
    outletId: string,
    data: UpdateReceiptTemplateData,
  ): Promise<ReceiptTemplate> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });
    const currentSettings = (outlet?.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      ...(data.showLogo !== undefined && { showLogo: data.showLogo }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.showQRCode !== undefined && { showQRCode: data.showQRCode }),
      ...(data.showTaxDetails !== undefined && { showTaxDetails: data.showTaxDetails }),
      ...(data.showServiceCharge !== undefined && { showServiceCharge: data.showServiceCharge }),
      ...(data.paperSize !== undefined && { paperSize: data.paperSize }),
      ...(data.fontSize !== undefined && { fontSize: data.fontSize }),
    };
    return this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        ...(data.header !== undefined && { receiptHeader: data.header }),
        ...(data.footer !== undefined && { receiptFooter: data.footer }),
        settings: updatedSettings as never,
      },
    });
  }

  // Operating Hours - stored in outlet settings JSON
  async getOperatingHours(outletId: string): Promise<OperatingHours[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });
    const settings = (outlet?.settings as Record<string, unknown>) || {};
    const hours = settings.operatingHours as OperatingHours[] | undefined;
    if (hours && Array.isArray(hours)) {
      return hours;
    }
    // Default: Open Mon-Sat 08:00-22:00, Closed Sunday
    return [
      { dayOfWeek: 0, isOpen: false, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '22:00' },
    ];
  }

  async updateOperatingHours(outletId: string, data: OperatingHoursData[]): Promise<void> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });
    const currentSettings = (outlet?.settings as Record<string, unknown>) || {};
    await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        settings: {
          ...currentSettings,
          operatingHours: data,
        } as never,
      },
    });
  }

  // Payment Methods - stored in business settings JSON
  async getPaymentMethods(businessId: string): Promise<PaymentMethodConfig[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    const settings = (business?.settings as Record<string, unknown>) || {};
    const methods = settings.paymentMethods as PaymentMethodConfig[] | undefined;
    if (methods && Array.isArray(methods)) {
      return methods;
    }
    // Default payment methods
    return [
      { method: 'cash', enabled: true, displayName: 'Tunai', sortOrder: 1 },
      {
        method: 'qris',
        enabled: true,
        displayName: 'QRIS',
        processingFee: 0.7,
        feeType: 'percentage',
        sortOrder: 2,
      },
      {
        method: 'card',
        enabled: true,
        displayName: 'Kartu Debit/Kredit',
        processingFee: 2.5,
        feeType: 'percentage',
        sortOrder: 3,
      },
      {
        method: 'gopay',
        enabled: true,
        displayName: 'GoPay',
        processingFee: 2,
        feeType: 'percentage',
        sortOrder: 4,
      },
      {
        method: 'ovo',
        enabled: true,
        displayName: 'OVO',
        processingFee: 2,
        feeType: 'percentage',
        sortOrder: 5,
      },
      {
        method: 'dana',
        enabled: true,
        displayName: 'DANA',
        processingFee: 1.5,
        feeType: 'percentage',
        sortOrder: 6,
      },
      {
        method: 'shopeepay',
        enabled: true,
        displayName: 'ShopeePay',
        processingFee: 1.5,
        feeType: 'percentage',
        sortOrder: 7,
      },
      { method: 'bank_transfer', enabled: false, displayName: 'Transfer Bank', sortOrder: 8 },
    ];
  }

  async updatePaymentMethods(businessId: string, data: PaymentMethodConfig[]): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    const currentSettings = (business?.settings as Record<string, unknown>) || {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          paymentMethods: data,
        } as never,
      },
    });
  }

  // ==================== Business Tax Config (new API) ====================

  async getBusinessTaxConfig(businessId: string): Promise<BusinessTaxConfig> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const settings = (business.settings as Record<string, unknown>) || {};
    const taxConfig = (settings.taxConfig as Record<string, unknown>) || {};
    return {
      taxEnabled: Boolean(taxConfig.taxEnabled ?? true),
      taxRate: Number(taxConfig.taxRate ?? 11),
      taxName: (taxConfig.taxName as string) || 'PPN',
      taxInclusive: Boolean(taxConfig.taxInclusive ?? false),
      serviceChargeEnabled: Boolean(taxConfig.serviceChargeEnabled ?? false),
      serviceChargeRate: Number(taxConfig.serviceChargeRate ?? 0),
    };
  }

  async updateBusinessTaxConfig(
    businessId: string,
    data: UpdateBusinessTaxConfigData,
  ): Promise<BusinessTaxConfig> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const currentSettings = (business.settings as Record<string, unknown>) || {};
    const currentTaxConfig = (currentSettings.taxConfig as Record<string, unknown>) || {};
    const updatedTaxConfig = {
      ...currentTaxConfig,
      ...(data.taxEnabled !== undefined && { taxEnabled: data.taxEnabled }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
      ...(data.taxName !== undefined && { taxName: data.taxName }),
      ...(data.taxInclusive !== undefined && { taxInclusive: data.taxInclusive }),
      ...(data.serviceChargeEnabled !== undefined && {
        serviceChargeEnabled: data.serviceChargeEnabled,
      }),
      ...(data.serviceChargeRate !== undefined && { serviceChargeRate: data.serviceChargeRate }),
    };
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          taxConfig: updatedTaxConfig,
        } as never,
      },
    });
    return {
      taxEnabled: Boolean(updatedTaxConfig.taxEnabled ?? true),
      taxRate: Number(updatedTaxConfig.taxRate ?? 11),
      taxName: (updatedTaxConfig.taxName as string) || 'PPN',
      taxInclusive: Boolean(updatedTaxConfig.taxInclusive ?? false),
      serviceChargeEnabled: Boolean(updatedTaxConfig.serviceChargeEnabled ?? false),
      serviceChargeRate: Number(updatedTaxConfig.serviceChargeRate ?? 0),
    };
  }

  // ==================== Outlet Receipt Template (new API) ====================

  async getOutletReceiptTemplate(outletId: string): Promise<OutletReceiptTemplate> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { receiptHeader: true, receiptFooter: true, settings: true },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    const settings = (outlet.settings as Record<string, unknown>) || {};
    const receiptConfig = (settings.receiptTemplate as Record<string, unknown>) || {};
    return {
      header: outlet.receiptHeader || '',
      footer: outlet.receiptFooter || '',
      showLogo: Boolean(receiptConfig.showLogo ?? true),
      showAddress: Boolean(receiptConfig.showAddress ?? true),
      showPhone: Boolean(receiptConfig.showPhone ?? true),
      showTaxDetails: Boolean(receiptConfig.showTaxDetails ?? true),
      showPaymentMethod: Boolean(receiptConfig.showPaymentMethod ?? true),
      paperWidth: (receiptConfig.paperWidth as '58mm' | '80mm') || '80mm',
      customMessage: (receiptConfig.customMessage as string) || '',
    };
  }

  async updateOutletReceiptTemplate(
    outletId: string,
    data: UpdateOutletReceiptTemplateData,
  ): Promise<OutletReceiptTemplate> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { receiptHeader: true, receiptFooter: true, settings: true },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    const currentSettings = (outlet.settings as Record<string, unknown>) || {};
    const currentReceiptConfig = (currentSettings.receiptTemplate as Record<string, unknown>) || {};
    const updatedReceiptConfig = {
      ...currentReceiptConfig,
      ...(data.showLogo !== undefined && { showLogo: data.showLogo }),
      ...(data.showAddress !== undefined && { showAddress: data.showAddress }),
      ...(data.showPhone !== undefined && { showPhone: data.showPhone }),
      ...(data.showTaxDetails !== undefined && { showTaxDetails: data.showTaxDetails }),
      ...(data.showPaymentMethod !== undefined && { showPaymentMethod: data.showPaymentMethod }),
      ...(data.paperWidth !== undefined && { paperWidth: data.paperWidth }),
      ...(data.customMessage !== undefined && { customMessage: data.customMessage }),
    };
    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        ...(data.header !== undefined && { receiptHeader: data.header }),
        ...(data.footer !== undefined && { receiptFooter: data.footer }),
        settings: {
          ...currentSettings,
          receiptTemplate: updatedReceiptConfig,
        } as never,
      },
      select: { receiptHeader: true, receiptFooter: true, settings: true },
    });
    const updatedSettings = (updated.settings as Record<string, unknown>) || {};
    const finalReceiptConfig = (updatedSettings.receiptTemplate as Record<string, unknown>) || {};
    return {
      header: updated.receiptHeader || '',
      footer: updated.receiptFooter || '',
      showLogo: Boolean(finalReceiptConfig.showLogo ?? true),
      showAddress: Boolean(finalReceiptConfig.showAddress ?? true),
      showPhone: Boolean(finalReceiptConfig.showPhone ?? true),
      showTaxDetails: Boolean(finalReceiptConfig.showTaxDetails ?? true),
      showPaymentMethod: Boolean(finalReceiptConfig.showPaymentMethod ?? true),
      paperWidth: (finalReceiptConfig.paperWidth as '58mm' | '80mm') || '80mm',
      customMessage: (finalReceiptConfig.customMessage as string) || '',
    };
  }

  // ==================== Outlet Operating Hours (new API) ====================

  async getOutletOperatingHours(outletId: string): Promise<OutletOperatingHoursEntry[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    const settings = (outlet.settings as Record<string, unknown>) || {};
    const hours = settings.operatingHoursV2 as OutletOperatingHoursEntry[] | undefined;
    if (hours && Array.isArray(hours) && hours.length === 7) {
      return hours;
    }
    // Default: Open Mon-Sat 08:00-22:00, Closed Sunday
    return [
      { dayOfWeek: 0, openTime: '08:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 6, openTime: '08:00', closeTime: '22:00', isClosed: false },
    ];
  }

  async updateOutletOperatingHours(
    outletId: string,
    data: OutletOperatingHoursEntry[],
  ): Promise<OutletOperatingHoursEntry[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { settings: true },
    });
    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }
    const currentSettings = (outlet.settings as Record<string, unknown>) || {};
    await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        settings: {
          ...currentSettings,
          operatingHoursV2: data,
        } as never,
      },
    });
    return data;
  }

  // ==================== Business Payment Methods (new CRUD API) ====================

  private generatePaymentMethodId(): string {
    return randomBytes(16).toString('hex');
  }

  async getBusinessPaymentMethods(businessId: string): Promise<BusinessPaymentMethod[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const settings = (business.settings as Record<string, unknown>) || {};
    const methods = settings.businessPaymentMethods as BusinessPaymentMethod[] | undefined;
    if (methods && Array.isArray(methods)) {
      return methods;
    }
    // Default payment methods
    const defaults: BusinessPaymentMethod[] = [
      {
        id: this.generatePaymentMethodId(),
        name: 'Tunai',
        type: 'cash',
        isActive: true,
        processingFee: 0,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'QRIS',
        type: 'qris',
        isActive: true,
        processingFee: 0.7,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'Kartu Debit/Kredit',
        type: 'card',
        isActive: true,
        processingFee: 2.5,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'GoPay',
        type: 'ewallet',
        isActive: true,
        processingFee: 2,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'OVO',
        type: 'ewallet',
        isActive: true,
        processingFee: 2,
        settings: {},
      },
      {
        id: this.generatePaymentMethodId(),
        name: 'Transfer Bank',
        type: 'bank_transfer',
        isActive: false,
        processingFee: 0,
        settings: {},
      },
    ];
    return defaults;
  }

  async createBusinessPaymentMethod(
    businessId: string,
    data: CreateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    const methods = await this.getBusinessPaymentMethods(businessId);
    const newMethod: BusinessPaymentMethod = {
      id: this.generatePaymentMethodId(),
      name: data.name,
      type: data.type,
      isActive: data.isActive ?? true,
      processingFee: data.processingFee ?? 0,
      settings: data.settings ?? {},
    };
    methods.push(newMethod);
    await this.saveBusinessPaymentMethods(businessId, methods);
    return newMethod;
  }

  async updateBusinessPaymentMethod(
    businessId: string,
    id: string,
    data: UpdateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod> {
    const methods = await this.getBusinessPaymentMethods(businessId);
    const index = methods.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new NotFoundException('Payment method not found');
    }
    const existing = methods[index];
    const updated: BusinessPaymentMethod = {
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.processingFee !== undefined && { processingFee: data.processingFee }),
      ...(data.settings !== undefined && { settings: data.settings }),
    };
    methods[index] = updated;
    await this.saveBusinessPaymentMethods(businessId, methods);
    return updated;
  }

  async deleteBusinessPaymentMethod(businessId: string, id: string): Promise<void> {
    const methods = await this.getBusinessPaymentMethods(businessId);
    const index = methods.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new NotFoundException('Payment method not found');
    }
    // Soft-delete by setting isActive to false
    methods[index] = { ...methods[index], isActive: false };
    await this.saveBusinessPaymentMethods(businessId, methods);
  }

  private async saveBusinessPaymentMethods(
    businessId: string,
    methods: BusinessPaymentMethod[],
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true },
    });
    const currentSettings = (business?.settings as Record<string, unknown>) || {};
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        settings: {
          ...currentSettings,
          businessPaymentMethods: methods,
        } as never,
      },
    });
  }
}
