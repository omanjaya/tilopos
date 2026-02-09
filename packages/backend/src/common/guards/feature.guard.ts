import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureService } from '@modules/business/services/feature.service';

interface RequestWithUser {
  body?: { businessId?: string };
  params?: { businessId?: string };
  query?: { businessId?: string };
  user?: { businessId?: string; outletId?: string };
}

export const FEATURE_KEY = 'requiredFeature';

/**
 * Decorator to mark a route/controller as requiring a specific feature
 * @example
 * @RequireFeature('kitchen_display')
 * @Controller('kds')
 * export class KdsController {}
 */
export const RequireFeature = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);

/**
 * Decorator to mark a route/controller as requiring ANY of the features
 * @example
 * @RequireAnyFeature(['kitchen_display', 'order_management'])
 * @Controller('orders')
 * export class OrdersController {}
 */
export const FEATURES_KEY = 'requiredFeatures';
export const RequireAnyFeature = (featureKeys: string[]) => SetMetadata(FEATURES_KEY, featureKeys);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for single required feature
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check for any of multiple features
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no feature requirement, allow access
    if (!requiredFeature && !requiredFeatures) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const businessId = this.extractBusinessId(request);

    if (!businessId) {
      throw new ForbiddenException('Business context not found');
    }

    // Check single feature
    if (requiredFeature) {
      const isEnabled = await this.featureService.isFeatureEnabled(businessId, requiredFeature);

      if (!isEnabled) {
        throw new ForbiddenException(
          `Feature "${requiredFeature}" is not enabled for this business`,
        );
      }

      return true;
    }

    // Check any of multiple features
    if (requiredFeatures && requiredFeatures.length > 0) {
      const enabledKeys = await this.featureService.getEnabledFeatureKeys(businessId);
      const hasAnyFeature = requiredFeatures.some((f) => enabledKeys.includes(f));

      if (!hasAnyFeature) {
        throw new ForbiddenException(
          `None of the required features are enabled: ${requiredFeatures.join(', ')}`,
        );
      }

      return true;
    }

    return true;
  }

  /**
   * Extract business ID from request
   * Priority: body > params > query > user context
   */
  private extractBusinessId(request: RequestWithUser): string | null {
    // From request body
    if (request.body?.businessId) {
      return request.body.businessId;
    }

    // From route params
    if (request.params?.businessId) {
      return request.params.businessId;
    }

    // From query params
    if (request.query?.businessId) {
      return request.query.businessId;
    }

    // From authenticated user context (most common)
    if (request.user?.businessId) {
      return request.user.businessId;
    }

    // From outlet context (for multi-outlet)
    if (request.user?.outletId) {
      return request.user.businessId ?? null;
    }

    return null;
  }
}
