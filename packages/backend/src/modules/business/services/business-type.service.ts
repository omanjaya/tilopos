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
  message?: string;
}

@Injectable()
export class BusinessTypeService {
  private readonly logger = new Logger(BusinessTypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureService: FeatureService,
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
   * Change business type and reset features to preset
   */
  async changeBusinessType(
    businessId: string,
    newTypeCode: string,
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

    // Initialize features based on new business type
    await this.featureService.initializeFeaturesForBusinessType(businessId, newTypeCode);

    // Count enabled features
    const enabledFeatures = await this.featureService.getEnabledFeatureKeys(businessId);

    this.logger.log(
      `Business ${businessId} changed type from "${previousType}" to "${newTypeCode}"`,
    );

    return {
      success: true,
      previousType,
      newType: newTypeCode,
      featuresEnabled: enabledFeatures.length,
    };
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
