import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  BUSINESS_TYPE_PRESETS,
  getBusinessTypePreset,
  isValidBusinessType,
  getAllBusinessTypeCodes,
  type BusinessTypePreset,
} from '@config/business-types.config';
import { FeatureService } from './feature.service';
import { OutletFeatureService } from './outlet-feature.service';
import { TemplatesService } from '../../templates/templates.service';

export interface BusinessTypeInfo {
  code: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  examples: string[];
  setAt?: Date;
}

export interface ChangeBusinessTypeResult {
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
  message?: string;
}

@Injectable()
export class BusinessTypeService {
  private readonly logger = new Logger(BusinessTypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureService: FeatureService,
    private readonly outletFeatureService: OutletFeatureService,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * Get all available business type presets
   */
  getAllPresets(): BusinessTypePreset[] {
    return BUSINESS_TYPE_PRESETS;
  }

  /**
   * Get presets grouped by category
   */
  getPresetsGrouped(): Record<string, BusinessTypePreset[]> {
    const grouped: Record<string, BusinessTypePreset[]> = {};

    for (const preset of BUSINESS_TYPE_PRESETS) {
      if (!grouped[preset.category]) {
        grouped[preset.category] = [];
      }
      grouped[preset.category].push(preset);
    }

    return grouped;
  }

  /**
   * Get current business type for a business
   */
  async getBusinessType(businessId: string): Promise<BusinessTypeInfo | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        businessType: true,
        businessTypeSetAt: true,
      },
    });

    if (!business) return null;

    const preset = getBusinessTypePreset(business.businessType);
    if (!preset) {
      return {
        code: business.businessType,
        label: 'Custom',
        description: 'Konfigurasi fitur custom',
        icon: 'Settings',
        category: 'custom',
        examples: [],
        setAt: business.businessTypeSetAt ?? undefined,
      };
    }

    return {
      code: preset.code,
      label: preset.label,
      description: preset.description,
      icon: preset.icon,
      category: preset.category,
      examples: preset.examples,
      setAt: business.businessTypeSetAt ?? undefined,
    };
  }

  /**
   * Change business type: soft-delete old data, reset features, apply new template
   */
  async changeBusinessType(
    businessId: string,
    newTypeCode: string,
    outletId?: string,
  ): Promise<ChangeBusinessTypeResult> {
    if (!isValidBusinessType(newTypeCode)) {
      throw new BadRequestException(`Invalid business type: ${newTypeCode}`);
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { businessType: true },
    });

    if (!business) {
      throw new BadRequestException('Business not found');
    }

    const previousType = business.businessType;

    // Resolve outletId — use provided or fallback to default outlet
    const resolvedOutletId = outletId ?? (await this.resolveDefaultOutletId(businessId));

    // 1. Soft-deactivate outlet-level data only (not business-level, other outlets unaffected)
    const dataReset = await this.deactivateOutletData(resolvedOutletId);

    // 2. Initialize features — both business-level and outlet-level
    await this.featureService.initializeFeaturesForBusinessType(businessId, newTypeCode);
    await this.outletFeatureService.initializeFeaturesForOutletType(resolvedOutletId, newTypeCode);

    // 3. Apply new template (skip if template not found, e.g. "custom")
    let templateApplied = false;
    let templateData:
      | { categories: number; products: number; modifierGroups: number; tables: number }
      | undefined;
    try {
      const result = await this.templatesService.applyTemplate(
        businessId,
        resolvedOutletId,
        newTypeCode,
        { categories: true, products: true, modifiers: true, tables: true },
      );
      templateApplied = true;
      templateData = {
        categories: result.categories,
        products: result.products,
        modifierGroups: result.modifierGroups,
        tables: result.tables,
      };
    } catch (error) {
      // Template not found (e.g. "custom" type) — continue without template
      this.logger.warn(
        `Template for "${newTypeCode}" not found, skipping template apply: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Count enabled features
    const enabledFeatures = await this.featureService.getEnabledFeatureKeys(businessId);

    this.logger.log(
      `Business ${businessId} changed type from "${previousType}" to "${newTypeCode}" ` +
        `(template: ${templateApplied}, deactivated: ${JSON.stringify(dataReset)})`,
    );

    return {
      success: true,
      previousType,
      newType: newTypeCode,
      featuresEnabled: enabledFeatures.length,
      templateApplied,
      dataReset,
      templateData,
    };
  }

  /**
   * Soft-deactivate outlet-level data only (outletProducts + tables).
   * Business-level data (products, categories, modifiers) is shared across outlets and stays active.
   */
  private async deactivateOutletData(outletId: string) {
    const [outletProducts, tables] = await this.prisma.$transaction([
      this.prisma.outletProduct.updateMany({
        where: { outletId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.table.updateMany({
        where: { outletId, isActive: true },
        data: { isActive: false },
      }),
    ]);

    return {
      outletProductsDeactivated: outletProducts.count,
      tablesDeactivated: tables.count,
    };
  }

  /**
   * Resolve the default outlet for a business (first outlet found)
   */
  private async resolveDefaultOutletId(businessId: string): Promise<string> {
    const outlet = await this.prisma.outlet.findFirst({
      where: { businessId },
      select: { id: true },
    });

    if (!outlet) {
      throw new BadRequestException('Business has no outlets');
    }

    return outlet.id;
  }

  /**
   * Check if business has set their business type
   */
  async hasSetBusinessType(businessId: string): Promise<boolean> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { businessTypeSetAt: true },
    });
    return !!business?.businessTypeSetAt;
  }

  /**
   * Get recommended business type based on existing data
   * (e.g., if they have ingredients, recommend F&B)
   */
  async getRecommendedBusinessType(businessId: string): Promise<string | null> {
    // Check existing data to recommend a business type
    const [hasIngredients, hasModifiers, hasTables] = await Promise.all([
      this.prisma.ingredient.count({ where: { businessId } }).then((c) => c > 0),
      this.prisma.modifierGroup.count({ where: { businessId } }).then((c) => c > 0),
      this.prisma.table.count({ where: { outlet: { businessId } } }).then((c) => c > 0),
    ]);

    if (hasIngredients || hasModifiers) {
      return hasTables ? 'fnb_restaurant' : 'fnb_cafe';
    }

    // Check for product variants
    const hasVariants = await this.prisma.productVariant
      .count({
        where: { product: { businessId } },
      })
      .then((c) => c > 0);

    if (hasVariants) {
      return 'retail_fashion';
    }

    // Default to custom if can't determine
    return null;
  }

  /**
   * Validate business type code
   */
  isValidType(code: string): boolean {
    return isValidBusinessType(code);
  }

  /**
   * Get all valid business type codes
   */
  getAllTypeCodes(): string[] {
    return getAllBusinessTypeCodes();
  }
}
