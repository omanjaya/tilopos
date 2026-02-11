import { Controller, Get, Put, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { OutletFeatureService, type OutletFeatureDto } from '../services/outlet-feature.service';
import { OutletTypeService, type OutletTypeInfo } from '../services/outlet-type.service';

// DTOs
class ToggleOutletFeatureDto {
  @IsBoolean()
  isEnabled!: boolean;
}

class ChangeOutletTypeDto {
  @IsString()
  @IsNotEmpty()
  outletType!: string;
}

// Response interfaces
interface OutletFeaturesResponse {
  features: OutletFeatureDto[];
}

interface OutletTypeResponse {
  outletType: OutletTypeInfo | null;
}

interface ChangeOutletTypeResponse {
  success: boolean;
  previousType: string;
  newType: string;
  featuresEnabled: number;
}

interface ToggleOutletFeatureResponse {
  success: boolean;
  featureKey: string;
  isEnabled: boolean;
  message?: string;
  affectedFeatures?: string[];
}

@Controller('outlet')
@UseGuards(JwtAuthGuard)
export class OutletFeatureController {
  constructor(
    private readonly outletFeatureService: OutletFeatureService,
    private readonly outletTypeService: OutletTypeService,
  ) {}

  // ============================================================================
  // OUTLET FEATURE ENDPOINTS
  // ============================================================================

  /**
   * GET /outlet/:outletId/features
   * Get all features with status for a specific outlet
   */
  @Get(':outletId/features')
  async getOutletFeatures(@Param('outletId') outletId: string): Promise<OutletFeaturesResponse> {
    const features = await this.outletFeatureService.getOutletFeatures(outletId);
    return { features };
  }

  /**
   * GET /outlet/:outletId/features/enabled
   * Get only enabled feature keys for an outlet (lightweight)
   */
  @Get(':outletId/features/enabled')
  async getEnabledFeatures(@Param('outletId') outletId: string): Promise<{ features: string[] }> {
    const features = await this.outletFeatureService.getEnabledFeatureKeys(outletId);
    return { features };
  }

  /**
   * PUT /outlet/:outletId/features/:featureKey
   * Toggle a specific feature on/off for an outlet
   */
  @Put(':outletId/features/:featureKey')
  @HttpCode(HttpStatus.OK)
  async toggleFeature(
    @Param('outletId') outletId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: ToggleOutletFeatureDto,
  ): Promise<ToggleOutletFeatureResponse> {
    return this.outletFeatureService.toggleFeature(outletId, featureKey, dto.isEnabled);
  }

  // ============================================================================
  // OUTLET TYPE ENDPOINTS
  // ============================================================================

  /**
   * GET /outlet/:outletId/type
   * Get current outlet type
   */
  @Get(':outletId/type')
  async getOutletType(@Param('outletId') outletId: string): Promise<OutletTypeResponse> {
    const outletType = await this.outletTypeService.getOutletType(outletId);
    return { outletType };
  }

  /**
   * PUT /outlet/:outletId/type
   * Change outlet type and reset features to preset
   */
  @Put(':outletId/type')
  @HttpCode(HttpStatus.OK)
  async changeOutletType(
    @Param('outletId') outletId: string,
    @Body() dto: ChangeOutletTypeDto,
  ): Promise<ChangeOutletTypeResponse> {
    return this.outletTypeService.changeOutletType(outletId, dto.outletType);
  }
}
