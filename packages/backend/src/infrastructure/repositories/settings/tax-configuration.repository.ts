import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toNumber } from '../../../shared/utils/money';
import type {
  TaxConfig,
  UpdateTaxConfigData,
  BusinessTaxConfig,
  UpdateBusinessTaxConfigData,
} from '../../../domain/interfaces/repositories/settings.repository';
import {
  asJsonObject,
  findBusinessSettings,
  findOwnedOutletSettings,
  mutateBusinessSettings,
  mutateOutletSettings,
  type JsonObject,
  type OutletSettingsRow,
} from './json-settings';

/** Rates are percentages (Decimal columns); converted to numbers only for the response. */
function toOutletTaxConfig(outletId: string, outlet: OutletSettingsRow): TaxConfig {
  const settings = asJsonObject(outlet.settings);
  return {
    outletId,
    taxRate: toNumber(outlet.taxRate),
    serviceCharge: toNumber(outlet.serviceCharge),
    taxInclusive: Boolean(settings.taxInclusive),
    taxName: (settings.taxName as string) || 'PPN',
    taxNumber: settings.taxNumber as string | undefined,
  };
}

function toBusinessTaxConfig(taxConfig: JsonObject): BusinessTaxConfig {
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
 * Tax configuration (business-level JSON and outlet-level columns).
 * All outlet access is scoped to the caller's business; unknown outlet → 404.
 */
@Injectable()
export class TaxConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxConfig(businessId: string, outletId: string): Promise<TaxConfig> {
    const outlet = await findOwnedOutletSettings(this.prisma, businessId, outletId);
    return toOutletTaxConfig(outletId, outlet);
  }

  async updateTaxConfig(
    businessId: string,
    outletId: string,
    data: UpdateTaxConfigData,
  ): Promise<TaxConfig> {
    const updated = await mutateOutletSettings(this.prisma, businessId, outletId, (current) => ({
      settings: {
        ...current,
        ...(data.taxInclusive !== undefined && { taxInclusive: data.taxInclusive }),
        ...(data.taxName !== undefined && { taxName: data.taxName }),
        ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber }),
      },
      columns: {
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.serviceCharge !== undefined && { serviceCharge: data.serviceCharge }),
      },
    }));
    return toOutletTaxConfig(outletId, updated);
  }

  async getBusinessTaxConfig(businessId: string): Promise<BusinessTaxConfig> {
    const settings = await findBusinessSettings(this.prisma, businessId);
    return toBusinessTaxConfig(asJsonObject(settings.taxConfig));
  }

  async updateBusinessTaxConfig(
    businessId: string,
    data: UpdateBusinessTaxConfigData,
  ): Promise<BusinessTaxConfig> {
    return mutateBusinessSettings(this.prisma, businessId, (current) => {
      const taxConfig = {
        ...asJsonObject(current.taxConfig),
        ...(data.taxEnabled !== undefined && { taxEnabled: data.taxEnabled }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.taxName !== undefined && { taxName: data.taxName }),
        ...(data.taxInclusive !== undefined && { taxInclusive: data.taxInclusive }),
        ...(data.serviceChargeEnabled !== undefined && {
          serviceChargeEnabled: data.serviceChargeEnabled,
        }),
        ...(data.serviceChargeRate !== undefined && {
          serviceChargeRate: data.serviceChargeRate,
        }),
      };
      return { settings: { ...current, taxConfig }, result: toBusinessTaxConfig(taxConfig) };
    });
  }
}
