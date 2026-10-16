import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  FEATURE_REGISTRY,
  getFeatureByKey,
  checkFeatureDependencies,
  type FeatureDefinition,
  type FeatureCategory,
} from '@config/features.config';
import { getBusinessTypePreset, isValidBusinessType } from '@config/business-types.config';
import { isFeatureRestrictedByPlan } from '@config/subscription-plans.config';

export interface BusinessFeatureDto {
  key: string;
  label: string;
  description: string;
  category: FeatureCategory;
  isEnabled: boolean;
  dependencies?: string[];
  icon?: string;
  restrictedByPlan?: boolean;
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
    const [enabledFeatures, business] = await Promise.all([
      this.prisma.businessFeature.findMany({
        where: { businessId, isEnabled: true },
        select: { featureKey: true },
      }),
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { subscriptionPlan: true },
      }),
    ]);

    const enabledKeys = new Set(enabledFeatures.map((f) => f.featureKey));
    const plan = (business?.subscriptionPlan as 'free' | 'premium') ?? 'free';

    return FEATURE_REGISTRY.map((feature) => {
      const restrictedByPlan = isFeatureRestrictedByPlan(plan, feature.key);
      return {
        key: feature.key,
        label: feature.label,
        description: feature.description,
        category: feature.category,
        isEnabled: restrictedByPlan ? false : enabledKeys.has(feature.key),
        dependencies: feature.dependencies,
        icon: feature.icon,
        restrictedByPlan,
      };
    });
  }

  /**
   * Get only enabled feature keys for a business
   */
  async getEnabledFeatureKeys(
    businessId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const features = await (tx ?? this.prisma).businessFeature.findMany({
      where: { businessId, isEnabled: true },
      select: { featureKey: true },
    });
    return features.map((f) => f.featureKey);
  }

  /**
   * Check if a specific feature is enabled for a business.
   * Also checks subscription plan restrictions.
   */
  async isFeatureEnabled(businessId: string, featureKey: string): Promise<boolean> {
    // Check subscription plan restriction first
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { subscriptionPlan: true },
    });

    if (business) {
      const plan = business.subscriptionPlan as 'free' | 'premium';
      if (isFeatureRestrictedByPlan(plan, featureKey)) {
        return false;
      }
    }

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

    // If disabling, also disable dependent features (one query for all dependents)
    const affectedFeatures: string[] = [];
    if (!enable) {
      const dependentKeys = FEATURE_REGISTRY.filter((f) =>
        f.dependencies?.includes(featureKey),
      ).map((f) => f.key);

      if (dependentKeys.length > 0) {
        const enabledDependents = await this.prisma.businessFeature.findMany({
          where: { businessId, featureKey: { in: dependentKeys }, isEnabled: true },
          select: { featureKey: true },
        });
        if (enabledDependents.length > 0) {
          const keys = enabledDependents.map((f) => f.featureKey);
          await this.prisma.businessFeature.updateMany({
            where: { businessId, featureKey: { in: keys } },
            data: { isEnabled: false, disabledAt: now },
          });
          affectedFeatures.push(...keys);
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
  async initializeFeaturesForBusinessType(
    businessId: string,
    businessType: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!isValidBusinessType(businessType)) {
      this.logger.warn(`Invalid business type: ${businessType}`);
      return;
    }

    const preset = getBusinessTypePreset(businessType);
    if (!preset) return;

    const run = async (client: Prisma.TransactionClient): Promise<number> => {
      const now = new Date();

      // Replace features atomically: a crash between delete and create must
      // never leave the business with no features (FeatureGuard would block everything).
      await client.businessFeature.deleteMany({ where: { businessId } });

      const featuresToCreate = preset.defaultFeatures.map((featureKey) => ({
        businessId,
        featureKey,
        isEnabled: true,
        enabledAt: now,
      }));
      const optionalToCreate = preset.optionalFeatures.map((featureKey) => ({
        businessId,
        featureKey,
        isEnabled: false,
      }));

      await client.businessFeature.createMany({
        data: [...featuresToCreate, ...optionalToCreate],
        skipDuplicates: true,
      });

      await client.business.update({
        where: { id: businessId },
        data: { businessType, businessTypeSetAt: now },
      });
      return featuresToCreate.length;
    };

    const count = tx ? await run(tx) : await this.prisma.$transaction((client) => run(client));

    this.logger.log(
      `Initialized ${count} features for business ${businessId} (type: ${businessType})`,
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
