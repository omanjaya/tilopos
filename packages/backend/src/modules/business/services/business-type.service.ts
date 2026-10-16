import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  BUSINESS_TYPE_PRESETS,
  getBusinessTypePreset,
  isValidBusinessType,
  type BusinessTypePreset,
} from '@config/business-types.config';
import { FeatureService } from './feature.service';
import { OutletFeatureService } from './outlet-feature.service';
import {
  TemplatesService,
  type TemplateData,
  type ApplySections,
} from '../../templates/templates.service';

const ALL_TEMPLATE_SECTIONS: ApplySections = {
  categories: true,
  products: true,
  modifiers: true,
  tables: true,
};

/** Interactive transaction budget for type changes (template apply can be large). */
export const TYPE_CHANGE_TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

/**
 * Loads the template for a type, or null when none exists (e.g. "custom").
 * Only a missing template is tolerated; any other error propagates.
 */
export async function loadTemplateOrNull(
  templatesService: TemplatesService,
  typeCode: string,
  logger: Logger,
): Promise<TemplateData | null> {
  try {
    return await templatesService.getTemplate(typeCode);
  } catch (error) {
    if (error instanceof NotFoundException) {
      logger.warn(`No template for "${typeCode}", skipping template apply`);
      return null;
    }
    throw error;
  }
}

/** Soft-deactivates outlet-level data (outletProducts + tables) of one outlet. */
export async function deactivateOutletData(
  tx: Prisma.TransactionClient,
  outletId: string,
): Promise<{ outletProductsDeactivated: number; tablesDeactivated: number }> {
  const outletProducts = await tx.outletProduct.updateMany({
    where: { outletId, isActive: true },
    data: { isActive: false },
  });
  const tables = await tx.table.updateMany({
    where: { outletId, isActive: true },
    data: { isActive: false },
  });
  return {
    outletProductsDeactivated: outletProducts.count,
    tablesDeactivated: tables.count,
  };
}

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
    modifiers: number;
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
   * Change business type (destructive for the target outlet): soft-deactivate its
   * outlet data, reset business + outlet features and apply the new template.
   * `outletId` must belong to `businessId`; everything runs in one transaction so
   * a failure never leaves the outlet wiped without a template.
   *
   * Pass `tx` to run inside a caller's transaction (guided setup) and
   * `templateSections` to apply only part of the template (default: all).
   */
  async changeBusinessType(
    businessId: string,
    newTypeCode: string,
    outletId?: string,
    tx?: Prisma.TransactionClient,
    templateSections: ApplySections = ALL_TEMPLATE_SECTIONS,
  ): Promise<ChangeBusinessTypeResult> {
    if (!isValidBusinessType(newTypeCode)) {
      throw new BadRequestException(`Invalid business type: ${newTypeCode}`);
    }

    // Read the template file before opening the transaction.
    const template = await loadTemplateOrNull(this.templatesService, newTypeCode, this.logger);

    const run = (client: Prisma.TransactionClient) =>
      this.changeBusinessTypeInTx(
        client,
        businessId,
        newTypeCode,
        outletId,
        template,
        templateSections,
      );

    const result = tx ? await run(tx) : await this.prisma.$transaction(run, TYPE_CHANGE_TX_OPTIONS);

    this.logger.log(
      `Business ${businessId} changed type from "${result.previousType}" to "${newTypeCode}" ` +
        `(template: ${result.templateApplied}, deactivated: ${JSON.stringify(result.dataReset)})`,
    );
    return result;
  }

  private async changeBusinessTypeInTx(
    tx: Prisma.TransactionClient,
    businessId: string,
    newTypeCode: string,
    outletId: string | undefined,
    template: TemplateData | null,
    templateSections: ApplySections,
  ): Promise<ChangeBusinessTypeResult> {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { businessType: true },
    });
    if (!business) {
      throw new BadRequestException('Business not found');
    }
    const previousType = business.businessType;

    const resolvedOutletId = await this.resolveOutletId(tx, businessId, outletId);

    // 1. Soft-deactivate outlet-level data only (other outlets unaffected)
    const dataReset = await deactivateOutletData(tx, resolvedOutletId);

    // 2. Initialize features — both business-level and outlet-level
    await this.featureService.initializeFeaturesForBusinessType(businessId, newTypeCode, tx);
    await this.outletFeatureService.initializeFeaturesForOutletType(
      resolvedOutletId,
      newTypeCode,
      tx,
    );

    // 3. Apply the new template (none for e.g. "custom")
    let templateData: ChangeBusinessTypeResult['templateData'];
    if (template) {
      const applied = await this.templatesService.applyTemplateData(
        tx,
        businessId,
        resolvedOutletId,
        template,
        templateSections,
      );
      templateData = {
        categories: applied.categories,
        products: applied.products,
        modifierGroups: applied.modifierGroups,
        modifiers: applied.modifiers,
        tables: applied.tables,
      };
    }

    const featuresEnabled = await tx.businessFeature.count({
      where: { businessId, isEnabled: true },
    });

    return {
      success: true,
      previousType,
      newType: newTypeCode,
      featuresEnabled,
      templateApplied: template !== null,
      dataReset,
      templateData,
    };
  }

  /**
   * The outlet to reset: the requested one (must belong to the business) or the
   * business's first outlet.
   */
  private async resolveOutletId(
    tx: Prisma.TransactionClient,
    businessId: string,
    outletId?: string,
  ): Promise<string> {
    if (outletId) {
      const owned = await tx.outlet.findFirst({
        where: { id: outletId, businessId },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenException('Outlet is not accessible');
      }
      return owned.id;
    }

    const outlet = await tx.outlet.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
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
}
