import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  ReceiptTemplate,
  UpdateReceiptTemplateData,
  OutletReceiptTemplate,
  UpdateOutletReceiptTemplateData,
} from '../../../domain/interfaces/repositories/settings.repository';
import {
  asJsonObject,
  findOwnedOutletSettings,
  mutateOutletSettings,
  type OutletSettingsRow,
} from './json-settings';

function toLegacyTemplate(outletId: string, outlet: OutletSettingsRow): ReceiptTemplate {
  const settings = asJsonObject(outlet.settings);
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

function toOutletTemplate(outlet: OutletSettingsRow): OutletReceiptTemplate {
  const receiptConfig = asJsonObject(asJsonObject(outlet.settings).receiptTemplate);
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

/**
 * Receipt templates stored on the outlet (columns + settings JSON).
 * Scoped to the caller's business; unknown outlet → 404 (never defaults).
 */
@Injectable()
export class ReceiptTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Legacy Receipt Template ====================

  async getReceiptTemplate(businessId: string, outletId: string): Promise<ReceiptTemplate> {
    const outlet = await findOwnedOutletSettings(this.prisma, businessId, outletId);
    return toLegacyTemplate(outletId, outlet);
  }

  async updateReceiptTemplate(
    businessId: string,
    outletId: string,
    data: UpdateReceiptTemplateData,
  ): Promise<ReceiptTemplate> {
    const updated = await mutateOutletSettings(this.prisma, businessId, outletId, (current) => ({
      settings: {
        ...current,
        ...(data.showLogo !== undefined && { showLogo: data.showLogo }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.showQRCode !== undefined && { showQRCode: data.showQRCode }),
        ...(data.showTaxDetails !== undefined && { showTaxDetails: data.showTaxDetails }),
        ...(data.showServiceCharge !== undefined && {
          showServiceCharge: data.showServiceCharge,
        }),
        ...(data.paperSize !== undefined && { paperSize: data.paperSize }),
        ...(data.fontSize !== undefined && { fontSize: data.fontSize }),
      },
      columns: {
        ...(data.header !== undefined && { receiptHeader: data.header }),
        ...(data.footer !== undefined && { receiptFooter: data.footer }),
      },
    }));
    return toLegacyTemplate(outletId, updated);
  }

  // ==================== Outlet Receipt Template (New Format) ====================

  async getOutletReceiptTemplate(
    businessId: string,
    outletId: string,
  ): Promise<OutletReceiptTemplate> {
    const outlet = await findOwnedOutletSettings(this.prisma, businessId, outletId);
    return toOutletTemplate(outlet);
  }

  async updateOutletReceiptTemplate(
    businessId: string,
    outletId: string,
    data: UpdateOutletReceiptTemplateData,
  ): Promise<OutletReceiptTemplate> {
    const updated = await mutateOutletSettings(this.prisma, businessId, outletId, (current) => ({
      settings: {
        ...current,
        receiptTemplate: {
          ...asJsonObject(current.receiptTemplate),
          ...(data.showLogo !== undefined && { showLogo: data.showLogo }),
          ...(data.showAddress !== undefined && { showAddress: data.showAddress }),
          ...(data.showPhone !== undefined && { showPhone: data.showPhone }),
          ...(data.showTaxDetails !== undefined && { showTaxDetails: data.showTaxDetails }),
          ...(data.showPaymentMethod !== undefined && {
            showPaymentMethod: data.showPaymentMethod,
          }),
          ...(data.paperWidth !== undefined && { paperWidth: data.paperWidth }),
          ...(data.customMessage !== undefined && { customMessage: data.customMessage }),
        },
      },
      columns: {
        ...(data.header !== undefined && { receiptHeader: data.header }),
        ...(data.footer !== undefined && { receiptFooter: data.footer }),
      },
    }));
    return toOutletTemplate(updated);
  }
}
