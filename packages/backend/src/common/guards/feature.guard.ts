import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureService } from '@modules/business/services/feature.service';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';

interface RequestWithUser {
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

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    // Public routes have no user; they must enforce availability themselves
    // (e.g. storefront checks store.isActive).
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Check for single required feature
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const businessId = this.extractBusinessId(request);

    if (!businessId) {
      throw new ForbiddenException('Business context not found');
    }

    const isEnabled = await this.featureService.isFeatureEnabled(businessId, requiredFeature);
    if (!isEnabled) {
      throw new ForbiddenException(`Feature "${requiredFeature}" is not enabled for this business`);
    }
    return true;
  }

  /**
   * Business context comes only from the authenticated user (JwtAuthGuard runs
   * first). Never from params/query/body — those are attacker-controlled.
   */
  private extractBusinessId(request: RequestWithUser): string | null {
    return request.user?.businessId ?? null;
  }
}
