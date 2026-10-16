import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { IsBoolean, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { CurrentUser } from '@infrastructure/auth/current-user.decorator';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { Roles } from '@infrastructure/auth/roles.decorator';
import { EmployeeRole } from '@shared/constants/roles';
import { TenantAccessService } from '@shared/tenant/tenant-access.service';
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
  @MaxLength(30)
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

/**
 * Reads are open to every role (the app layout loads enabled features and the
 * outlet type for all users); mutations are owner/manager only.
 */
@Controller('outlet')
export class OutletFeatureController {
  constructor(
    private readonly outletFeatureService: OutletFeatureService,
    private readonly outletTypeService: OutletTypeService,
    private readonly tenant: TenantAccessService,
  ) {}

  // ============================================================================
  // OUTLET FEATURE ENDPOINTS
  // ============================================================================

  /**
   * GET /outlet/:outletId/features
   * Get all features with status for a specific outlet
   */
  @Get(':outletId/features')
  async getOutletFeatures(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<OutletFeaturesResponse> {
    await this.tenant.assertOutlet(user, outletId);
    const features = await this.outletFeatureService.getOutletFeatures(outletId);
    return { features };
  }

  /**
   * GET /outlet/:outletId/features/enabled
   * Get only enabled feature keys for an outlet (lightweight)
   */
  @Get(':outletId/features/enabled')
  async getEnabledFeatures(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ features: string[] }> {
    await this.tenant.assertOutlet(user, outletId);
    const features = await this.outletFeatureService.getEnabledFeatureKeys(outletId);
    return { features };
  }

  /**
   * PUT /outlet/:outletId/features/:featureKey
   * Toggle a specific feature on/off for an outlet
   */
  @Put(':outletId/features/:featureKey')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async toggleFeature(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: ToggleOutletFeatureDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ToggleOutletFeatureResponse> {
    await this.tenant.assertOutlet(user, outletId);
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
  async getOutletType(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<OutletTypeResponse> {
    await this.tenant.assertOutlet(user, outletId);
    const outletType = await this.outletTypeService.getOutletType(outletId, user.businessId);
    return { outletType };
  }

  /**
   * PUT /outlet/:outletId/type
   * Change outlet type and reset features to preset
   */
  @Put(':outletId/type')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async changeOutletType(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Body() dto: ChangeOutletTypeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeOutletTypeResponse> {
    await this.tenant.assertOutlet(user, outletId);
    return this.outletTypeService.changeOutletType(outletId, user.businessId, dto.outletType);
  }
}
