import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  ReceiptTemplate,
  UpdateReceiptTemplateData,
  OutletReceiptTemplate,
  UpdateOutletReceiptTemplateData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing receipt templates.
 * Handles receipt formatting, branding, and display options.
 */
@Injectable()
export class ReceiptTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Legacy Receipt Template ====================

  /**
   * Get receipt template for an outlet (legacy format)
   * Returns default values if outlet not found
   */
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

  /**
   * Update receipt template (legacy format)
   */
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

    const updated = await this.prisma.outlet.update({
      where: { id: outletId },
      data: {
        ...(data.header !== undefined && { receiptHeader: data.header }),
        ...(data.footer !== undefined && { receiptFooter: data.footer }),
        settings: updatedSettings as never,
      },
      select: { receiptHeader: true, receiptFooter: true, settings: true },
    });

    const settings = (updated.settings as Record<string, unknown>) || {};
    return {
      outletId,
      header: updated.receiptHeader || '',
      footer: updated.receiptFooter || '',
      showLogo: Boolean(settings.showLogo ?? true),
      logoUrl: settings.logoUrl as string | undefined,
      showQRCode: Boolean(settings.showQRCode),
      showTaxDetails: Boolean(settings.showTaxDetails ?? true),
      showServiceCharge: Boolean(settings.showServiceCharge ?? true),
      paperSize: (settings.paperSize as '58mm' | '80mm') || '80mm',
      fontSize: (settings.fontSize as 'small' | 'medium' | 'large') || 'medium',
    };
  }

  // ==================== Outlet Receipt Template (New Format) ====================

  /**
   * Get outlet receipt template (new format)
   * @throws NotFoundException if outlet not found
   */
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

  /**
   * Update outlet receipt template (new format)
   * @throws NotFoundException if outlet not found
   */
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
}
