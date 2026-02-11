import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  BUSINESS_TYPE_PRESETS,
  getBusinessTypePreset,
  isValidBusinessType,
  type BusinessTypePreset,
} from '@config/business-types.config';
import { OutletFeatureService } from './outlet-feature.service';

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
}

@Injectable()
export class OutletTypeService {
  private readonly logger = new Logger(OutletTypeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outletFeatureService: OutletFeatureService,
  ) {}

  /**
   * Get current outlet type
   */
  async getOutletType(outletId: string): Promise<OutletTypeInfo | null> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
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
   * Change outlet type and reset its features to the new preset
   */
  async changeOutletType(outletId: string, newTypeCode: string): Promise<ChangeOutletTypeResult> {
    if (!isValidBusinessType(newTypeCode)) {
      throw new BadRequestException(`Invalid outlet type: ${newTypeCode}`);
    }

    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { outletType: true },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }

    const previousType = outlet.outletType;

    // Initialize features based on new outlet type
    await this.outletFeatureService.initializeFeaturesForOutletType(outletId, newTypeCode);

    // Count enabled features
    const enabledFeatures = await this.outletFeatureService.getEnabledFeatureKeys(outletId);

    this.logger.log(`Outlet ${outletId} changed type from "${previousType}" to "${newTypeCode}"`);

    return {
      success: true,
      previousType,
      newType: newTypeCode,
      featuresEnabled: enabledFeatures.length,
    };
  }

  /**
   * Get all available presets (reuse from business-types config)
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
   * Validate outlet type code
   */
  isValidType(code: string): boolean {
    return isValidBusinessType(code);
  }
}
