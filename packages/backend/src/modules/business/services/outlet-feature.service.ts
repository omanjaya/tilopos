import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  FEATURE_REGISTRY,
  getFeatureByKey,
  checkFeatureDependencies,
  type FeatureCategory,
} from '@config/features.config';
import { getBusinessTypePreset, isValidBusinessType } from '@config/business-types.config';

export interface OutletFeatureDto {
  key: string;
  label: string;
  description: string;
  category: FeatureCategory;
  isEnabled: boolean;
  dependencies?: string[];
  icon?: string;
}

export interface ToggleOutletFeatureResult {
  success: boolean;
  featureKey: string;
  isEnabled: boolean;
  message?: string;
  affectedFeatures?: string[];
}

@Injectable()
export class OutletFeatureService {
  private readonly logger = new Logger(OutletFeatureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all features for an outlet with their current status.
   * Falls back to BusinessFeature if no OutletFeature records exist.
   */
  async getOutletFeatures(outletId: string): Promise<OutletFeatureDto[]> {
    const outletFeatureCount = await this.prisma.outletFeature.count({
      where: { outletId },
    });

    // Fallback to business-level features if outlet has none
    if (outletFeatureCount === 0) {
      return this.getBusinessFeaturesForOutlet(outletId);
    }

    const enabledFeatures = await this.prisma.outletFeature.findMany({
      where: { outletId, isEnabled: true },
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
   * Get only enabled feature keys for an outlet.
   * Falls back to BusinessFeature if no OutletFeature records exist.
   */
  async getEnabledFeatureKeys(outletId: string): Promise<string[]> {
    const outletFeatureCount = await this.prisma.outletFeature.count({
      where: { outletId },
    });

    if (outletFeatureCount === 0) {
      return this.getEnabledBusinessFeatureKeysForOutlet(outletId);
    }

    const features = await this.prisma.outletFeature.findMany({
      where: { outletId, isEnabled: true },
      select: { featureKey: true },
    });
    return features.map((f) => f.featureKey);
  }

  /**
   * Toggle a feature on/off for an outlet
   */
  async toggleFeature(
    outletId: string,
    featureKey: string,
    enable: boolean,
  ): Promise<ToggleOutletFeatureResult> {
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
      const enabledKeys = await this.getEnabledFeatureKeys(outletId);
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

    await this.prisma.outletFeature.upsert({
      where: {
        outletId_featureKey: { outletId, featureKey },
      },
      create: {
        outletId,
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
        const existing = await this.prisma.outletFeature.findUnique({
          where: { outletId_featureKey: { outletId, featureKey: dep.key } },
        });
        if (existing?.isEnabled) {
          await this.prisma.outletFeature.update({
            where: { outletId_featureKey: { outletId, featureKey: dep.key } },
            data: { isEnabled: false, disabledAt: now },
          });
          affectedFeatures.push(dep.key);
        }
      }
    }

    this.logger.log(
      `Feature "${featureKey}" ${enable ? 'enabled' : 'disabled'} for outlet ${outletId}`,
    );

    return {
      success: true,
      featureKey,
      isEnabled: enable,
      affectedFeatures: affectedFeatures.length > 0 ? affectedFeatures : undefined,
    };
  }

  /**
   * Initialize features for an outlet based on its type preset
   */
  async initializeFeaturesForOutletType(outletId: string, outletType: string): Promise<void> {
    if (!isValidBusinessType(outletType)) {
      this.logger.warn(`Invalid outlet type: ${outletType}`);
      return;
    }

    const preset = getBusinessTypePreset(outletType);
    if (!preset) return;

    const now = new Date();

    // Delete existing outlet features
    await this.prisma.outletFeature.deleteMany({ where: { outletId } });

    // Create features based on preset
    const featuresToCreate = preset.defaultFeatures.map((featureKey) => ({
      outletId,
      featureKey,
      isEnabled: true,
      enabledAt: now,
    }));

    const optionalToCreate = preset.optionalFeatures.map((featureKey) => ({
      outletId,
      featureKey,
      isEnabled: false,
    }));

    await this.prisma.outletFeature.createMany({
      data: [...featuresToCreate, ...optionalToCreate],
    });

    // Update outlet type
    await this.prisma.outlet.update({
      where: { id: outletId },
      data: { outletType, outletTypeSetAt: now },
    });

    this.logger.log(
      `Initialized ${featuresToCreate.length} features for outlet ${outletId} (type: ${outletType})`,
    );
  }

  // ---- Private fallback methods ----

  private async getBusinessFeaturesForOutlet(outletId: string): Promise<OutletFeatureDto[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet) return [];

    const enabledFeatures = await this.prisma.businessFeature.findMany({
      where: { businessId: outlet.businessId, isEnabled: true },
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

  private async getEnabledBusinessFeatureKeysForOutlet(outletId: string): Promise<string[]> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    if (!outlet) return [];

    const features = await this.prisma.businessFeature.findMany({
      where: { businessId: outlet.businessId, isEnabled: true },
      select: { featureKey: true },
    });
    return features.map((f) => f.featureKey);
  }
}
