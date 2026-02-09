import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  FEATURE_REGISTRY,
  getFeatureByKey,
  checkFeatureDependencies,
  type FeatureDefinition,
  type FeatureCategory,
} from '@config/features.config';
import { getBusinessTypePreset, isValidBusinessType } from '@config/business-types.config';

export interface BusinessFeatureDto {
  key: string;
  label: string;
  description: string;
  category: FeatureCategory;
  isEnabled: boolean;
  dependencies?: string[];
  icon?: string;
}

export interface ToggleFeatureResult {
  success: boolean;
  featureKey: string;
  isEnabled: boolean;
  message?: string;
  affectedFeatures?: string[];
}

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all features for a business with their current status
   */
  async getBusinessFeatures(businessId: string): Promise<BusinessFeatureDto[]> {
    const enabledFeatures = await this.prisma.businessFeature.findMany({
      where: { businessId, isEnabled: true },
      select: { featureKey: true },
    });

    const enabledKeys = new Set(enabledFeatures.map((f) => f.featureKey));

    return FEATURE_REGISTRY.map((feature) => ({
      key: feature.key,
      label: feature.label,
      description: feature.description,
      category: feature.category,
      isEnabled: enabledKeys.has(feature.key),
      dependencies: feature.dependencies,
      icon: feature.icon,
    }));
  }

  /**
   * Get only enabled feature keys for a business
   */
  async getEnabledFeatureKeys(businessId: string): Promise<string[]> {
    const features = await this.prisma.businessFeature.findMany({
      where: { businessId, isEnabled: true },
      select: { featureKey: true },
    });
    return features.map((f) => f.featureKey);
  }

  /**
   * Check if a specific feature is enabled for a business
   */
  async isFeatureEnabled(businessId: string, featureKey: string): Promise<boolean> {
    const feature = await this.prisma.businessFeature.findUnique({
      where: {
        businessId_featureKey: { businessId, featureKey },
      },
    });
    return feature?.isEnabled ?? false;
  }

  /**
   * Toggle a feature on/off for a business
   */
  async toggleFeature(
    businessId: string,
    featureKey: string,
    enable: boolean,
  ): Promise<ToggleFeatureResult> {
    const featureDef = getFeatureByKey(featureKey);
    if (!featureDef) {
      return {
        success: false,
        featureKey,
        isEnabled: false,
        message: `Feature "${featureKey}" not found`,
      };
    }

    // Check dependencies if enabling
    if (enable && featureDef.dependencies?.length) {
      const enabledKeys = await this.getEnabledFeatureKeys(businessId);
      const { valid, missingDependencies } = checkFeatureDependencies(featureKey, enabledKeys);

      if (!valid) {
        return {
          success: false,
          featureKey,
          isEnabled: false,
          message: `Missing dependencies: ${missingDependencies.join(', ')}`,
          affectedFeatures: missingDependencies,
        };
      }
    }

    const now = new Date();

    await this.prisma.businessFeature.upsert({
      where: {
        businessId_featureKey: { businessId, featureKey },
      },
      create: {
        businessId,
        featureKey,
        isEnabled: enable,
        enabledAt: enable ? now : null,
        disabledAt: enable ? null : now,
      },
      update: {
        isEnabled: enable,
        enabledAt: enable ? now : undefined,
        disabledAt: enable ? null : now,
      },
    });

    // If disabling, also disable dependent features
    const affectedFeatures: string[] = [];
    if (!enable) {
      const dependentFeatures = FEATURE_REGISTRY.filter((f) =>
        f.dependencies?.includes(featureKey),
      );

      for (const dep of dependentFeatures) {
        const isEnabled = await this.isFeatureEnabled(businessId, dep.key);
        if (isEnabled) {
          await this.prisma.businessFeature.update({
            where: {
              businessId_featureKey: { businessId, featureKey: dep.key },
            },
            data: {
              isEnabled: false,
              disabledAt: now,
            },
          });
          affectedFeatures.push(dep.key);
        }
      }
    }

    this.logger.log(
      `Feature "${featureKey}" ${enable ? 'enabled' : 'disabled'} for business ${businessId}`,
    );

    return {
      success: true,
      featureKey,
      isEnabled: enable,
      affectedFeatures: affectedFeatures.length > 0 ? affectedFeatures : undefined,
    };
  }

  /**
   * Bulk update features for a business
   */
  async bulkUpdateFeatures(
    businessId: string,
    features: { key: string; enabled: boolean }[],
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const { key, enabled } of features) {
      const result = await this.toggleFeature(businessId, key, enabled);
      if (result.success) {
        updated++;
      } else {
        errors.push(`${key}: ${result.message}`);
      }
    }

    return { success: errors.length === 0, updated, errors };
  }

  /**
   * Initialize features for a business based on business type
   */
  async initializeFeaturesForBusinessType(businessId: string, businessType: string): Promise<void> {
    if (!isValidBusinessType(businessType)) {
      this.logger.warn(`Invalid business type: ${businessType}`);
      return;
    }

    const preset = getBusinessTypePreset(businessType);
    if (!preset) return;

    const now = new Date();

    // Delete existing features
    await this.prisma.businessFeature.deleteMany({
      where: { businessId },
    });

    // Create features based on preset
    const featuresToCreate = preset.defaultFeatures.map((featureKey) => ({
      businessId,
      featureKey,
      isEnabled: true,
      enabledAt: now,
    }));

    // Also create optional features as disabled
    const optionalToCreate = preset.optionalFeatures.map((featureKey) => ({
      businessId,
      featureKey,
      isEnabled: false,
    }));

    await this.prisma.businessFeature.createMany({
      data: [...featuresToCreate, ...optionalToCreate],
    });

    // Update business type
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        businessType,
        businessTypeSetAt: now,
      },
    });

    this.logger.log(
      `Initialized ${featuresToCreate.length} features for business ${businessId} (type: ${businessType})`,
    );
  }

  /**
   * Get feature registry (static list of all available features)
   */
  getFeatureRegistry(): FeatureDefinition[] {
    return FEATURE_REGISTRY;
  }

  /**
   * Get features grouped by category
   */
  async getFeaturesByCategory(
    businessId: string,
  ): Promise<Record<FeatureCategory, BusinessFeatureDto[]>> {
    const features = await this.getBusinessFeatures(businessId);

    const grouped: Record<FeatureCategory, BusinessFeatureDto[]> = {
      sales: [],
      inventory: [],
      marketing: [],
      service: [],
      advanced: [],
    };

    for (const feature of features) {
      grouped[feature.category].push(feature);
    }

    return grouped;
  }
}
