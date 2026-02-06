import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  TaxConfig,
  UpdateTaxConfigData,
  BusinessTaxConfig,
  UpdateBusinessTaxConfigData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing tax configurations.
 * Handles both business-level and outlet-level tax settings.
 */
@Injectable()
export class TaxConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Outlet Tax Config ====================

  /**
   * Get tax configuration for an outlet
   * Returns default values if outlet not found
   */
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

  /**
   * Update outlet tax configuration
   */
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

    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.serviceCharge !== undefined && { serviceCharge: data.serviceCharge }),
        settings: updatedSettings as never,
      },
      select: { taxRate: true, serviceCharge: true, settings: true },
    });

    const settings = (updated.settings as Record<string, unknown>) || {};
    return {
      outletId,
      taxRate: Number(updated.taxRate),
      serviceCharge: Number(updated.serviceCharge),
      taxInclusive: Boolean(settings.taxInclusive),
      taxName: (settings.taxName as string) || 'PPN',
      taxNumber: settings.taxNumber as string | undefined,
    };
  }

  // ==================== Business Tax Config ====================

  /**
   * Get business-level tax configuration
   * @throws NotFoundException if business not found
   */
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

  /**
   * Update business-level tax configuration
   * @throws NotFoundException if business not found
   */
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
}
