import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { getBusinessTypePreset, isValidBusinessType } from '@config/business-types.config';
import { OutletFeatureService } from './outlet-feature.service';
import { TemplatesService } from '../../templates/templates.service';
import {
  TYPE_CHANGE_TX_OPTIONS,
  deactivateOutletData,
  loadTemplateOrNull,
} from './business-type.service';

export interface OutletTypeInfo {
  code: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  examples: string[];
  setAt?: Date;
}

export interface ChangeOutletTypeResult {
  success: boolean;
  previousType: string;
  newType: string;
  featuresEnabled: number;
  templateApplied: boolean;
  dataReset: {
    outletProductsDeactivated: number;
    tablesDeactivated: number;
  };
  templateData?: {
    categories: number;
    products: number;
    modifierGroups: number;
    tables: number;
  };
}

@Injectable()
export class OutletTypeService {
  private readonly logger = new Logger(OutletTypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outletFeatureService: OutletFeatureService,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * Get current outlet type
   */
  async getOutletType(outletId: string, businessId: string): Promise<OutletTypeInfo | null> {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, businessId },
      select: { outletType: true, outletTypeSetAt: true },
    });

    if (!outlet) return null;

    const preset = getBusinessTypePreset(outlet.outletType);
    if (!preset) {
      return {
        code: outlet.outletType,
        label: 'Custom',
        description: 'Konfigurasi fitur custom',
        icon: 'Settings',
        category: 'custom',
        examples: [],
        setAt: outlet.outletTypeSetAt ?? undefined,
      };
    }

    return {
      code: preset.code,
      label: preset.label,
      description: preset.description,
      icon: preset.icon,
      category: preset.category,
      examples: preset.examples,
      setAt: outlet.outletTypeSetAt ?? undefined,
    };
  }

  /**
   * Change outlet type (destructive for the outlet): soft-deactivate outlet data,
   * reset features and apply the new template, all in one transaction.
   */
  async changeOutletType(
    outletId: string,
    businessId: string,
    newTypeCode: string,
  ): Promise<ChangeOutletTypeResult> {
    if (!isValidBusinessType(newTypeCode)) {
      throw new BadRequestException(`Invalid outlet type: ${newTypeCode}`);
    }

    const template = await loadTemplateOrNull(this.templatesService, newTypeCode, this.logger);

    const result = await this.prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findFirst({
        where: { id: outletId, businessId },
        select: { outletType: true },
      });
      if (!outlet) {
        throw new NotFoundException('Outlet not found');
      }

      const dataReset = await deactivateOutletData(tx, outletId);
      await this.outletFeatureService.initializeFeaturesForOutletType(outletId, newTypeCode, tx);

      let templateData: ChangeOutletTypeResult['templateData'];
      if (template) {
        const applied = await this.templatesService.applyTemplateData(
          tx,
          businessId,
          outletId,
          template,
          { categories: true, products: true, modifiers: true, tables: true },
        );
        templateData = {
          categories: applied.categories,
          products: applied.products,
          modifierGroups: applied.modifierGroups,
          tables: applied.tables,
        };
      }

      const featuresEnabled = await tx.outletFeature.count({
        where: { outletId, isEnabled: true },
      });

      return {
        success: true,
        previousType: outlet.outletType,
        newType: newTypeCode,
        featuresEnabled,
        templateApplied: template !== null,
        dataReset,
        templateData,
      };
    }, TYPE_CHANGE_TX_OPTIONS);

    this.logger.log(
      `Outlet ${outletId} changed type from "${result.previousType}" to "${newTypeCode}" ` +
        `(template: ${result.templateApplied}, deactivated: ${JSON.stringify(result.dataReset)})`,
    );
    return result;
  }
}
