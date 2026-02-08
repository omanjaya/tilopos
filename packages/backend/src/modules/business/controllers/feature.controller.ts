import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import { FeatureService, type BusinessFeatureDto } from '../services/feature.service';
import { BusinessTypeService, type BusinessTypeInfo } from '../services/business-type.service';
import { type BusinessTypePreset } from '@config/business-types.config';
import { type FeatureDefinition } from '@config/features.config';

// DTOs
class ToggleFeatureDto {
    isEnabled!: boolean;
}

class BulkUpdateFeaturesDto {
    features!: { key: string; enabled: boolean }[];
}

class ChangeBusinessTypeDto {
    businessType!: string;
}

// Response interfaces
interface FeaturesResponse {
    features: BusinessFeatureDto[];
}

interface FeaturesByCategoryResponse {
    sales: BusinessFeatureDto[];
    inventory: BusinessFeatureDto[];
    marketing: BusinessFeatureDto[];
    service: BusinessFeatureDto[];
    advanced: BusinessFeatureDto[];
}

interface ToggleFeatureResponse {
    success: boolean;
    featureKey: string;
    isEnabled: boolean;
    message?: string;
    affectedFeatures?: string[];
}

interface BulkUpdateResponse {
    success: boolean;
    updated: number;
    errors: string[];
}

interface BusinessTypeResponse {
    businessType: BusinessTypeInfo | null;
    hasSetType: boolean;
    recommendation?: string | null;
}

interface TypePresetsResponse {
    presets: BusinessTypePreset[];
    grouped: Record<string, BusinessTypePreset[]>;
}

interface ChangeTypeResponse {
    success: boolean;
    previousType: string;
    newType: string;
    featuresEnabled: number;
}

interface FeatureRegistryResponse {
    features: FeatureDefinition[];
    total: number;
}

@Controller('business')
@UseGuards(JwtAuthGuard)
export class FeatureController {
    constructor(
        private readonly featureService: FeatureService,
        private readonly businessTypeService: BusinessTypeService,
    ) { }

    // ============================================================================
    // FEATURE ENDPOINTS
    // ============================================================================

    /**
     * GET /business/features
     * Get all features with their current status for the business
     */
    @Get('features')
    async getFeatures(
        @CurrentUser() user: { businessId: string },
    ): Promise<FeaturesResponse> {
        const features = await this.featureService.getBusinessFeatures(user.businessId);
        return { features };
    }

    /**
     * GET /business/features/by-category
     * Get features grouped by category
     */
    @Get('features/by-category')
    async getFeaturesByCategory(
        @CurrentUser() user: { businessId: string },
    ): Promise<FeaturesByCategoryResponse> {
        return this.featureService.getFeaturesByCategory(user.businessId);
    }

    /**
     * GET /business/features/enabled
     * Get only enabled feature keys (lightweight)
     */
    @Get('features/enabled')
    async getEnabledFeatures(
        @CurrentUser() user: { businessId: string },
    ): Promise<{ features: string[] }> {
        const features = await this.featureService.getEnabledFeatureKeys(user.businessId);
        return { features };
    }

    /**
     * PUT /business/features/:featureKey
     * Toggle a specific feature on/off
     */
    @Put('features/:featureKey')
    @HttpCode(HttpStatus.OK)
    async toggleFeature(
        @CurrentUser() user: { businessId: string },
        @Param('featureKey') featureKey: string,
        @Body() dto: ToggleFeatureDto,
    ): Promise<ToggleFeatureResponse> {
        return this.featureService.toggleFeature(
            user.businessId,
            featureKey,
            dto.isEnabled,
        );
    }

    /**
     * PUT /business/features/bulk
     * Bulk update multiple features at once
     */
    @Put('features/bulk')
    @HttpCode(HttpStatus.OK)
    async bulkUpdateFeatures(
        @CurrentUser() user: { businessId: string },
        @Body() dto: BulkUpdateFeaturesDto,
    ): Promise<BulkUpdateResponse> {
        return this.featureService.bulkUpdateFeatures(user.businessId, dto.features);
    }

    /**
     * GET /business/features/registry
     * Get static feature registry (all available features)
     */
    @Get('features/registry')
    getFeatureRegistry(): FeatureRegistryResponse {
        const features = this.featureService.getFeatureRegistry();
        return { features, total: features.length };
    }

    // ============================================================================
    // BUSINESS TYPE ENDPOINTS
    // ============================================================================

    /**
     * GET /business/type
     * Get current business type
     */
    @Get('type')
    async getBusinessType(
        @CurrentUser() user: { businessId: string },
    ): Promise<BusinessTypeResponse> {
        const [businessType, hasSetType, recommendation] = await Promise.all([
            this.businessTypeService.getBusinessType(user.businessId),
            this.businessTypeService.hasSetBusinessType(user.businessId),
            this.businessTypeService.getRecommendedBusinessType(user.businessId),
        ]);

        return { businessType, hasSetType, recommendation };
    }

    /**
     * PUT /business/type
     * Change business type and reset features to preset
     */
    @Put('type')
    @HttpCode(HttpStatus.OK)
    async changeBusinessType(
        @CurrentUser() user: { businessId: string },
        @Body() dto: ChangeBusinessTypeDto,
    ): Promise<ChangeTypeResponse> {
        return this.businessTypeService.changeBusinessType(
            user.businessId,
            dto.businessType,
        );
    }

    /**
     * GET /business/types/presets
     * Get all available business type presets
     */
    @Get('types/presets')
    getTypePresets(): TypePresetsResponse {
        return {
            presets: this.businessTypeService.getAllPresets(),
            grouped: this.businessTypeService.getPresetsGrouped(),
        };
    }

    /**
     * GET /business/types/validate/:code
     * Validate if a business type code is valid
     */
    @Get('types/validate/:code')
    validateTypeCode(@Param('code') code: string): { valid: boolean } {
        return { valid: this.businessTypeService.isValidType(code) };
    }
}
