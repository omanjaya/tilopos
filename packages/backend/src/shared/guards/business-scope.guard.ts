import {
  SetMetadata,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';

/** Minimal interface for dynamically accessed Prisma model delegates */
interface PrismaDelegate {
  findUnique(args: { where: Record<string, unknown>; select: Record<string, unknown> }): Promise<{
    businessId?: string;
    outlet?: { businessId: string };
    product?: { businessId: string };
  } | null>;
}

export const BUSINESS_SCOPE_KEY = 'businessScope';

export interface BusinessScopeOptions {
  resource:
    | 'product'
    | 'customer'
    | 'order'
    | 'table'
    | 'promotion'
    | 'supplier'
    | 'employee'
    | 'outlet'
    | 'category'
    | 'ingredient'
    | 'recipe'
    | 'workOrder'
    | 'modifierGroup'
    | 'loyaltyTier';
  param: string; // e.g., 'id', 'productId', 'customerId'
  optional?: boolean; // Allow if resource not found (for list endpoints)
}

/**
 * Decorator to mark endpoints that require business scope validation
 *
 * @example
 * ```ts
 * @Get(':id')
 * @BusinessScoped({ resource: 'product', param: 'id' })
 * async getProduct(@Param('id') id: string) {
 *   // Guard ensures product belongs to user's business
 * }
 * ```
 */
export const BusinessScoped = (options: BusinessScopeOptions) =>
  SetMetadata(BUSINESS_SCOPE_KEY, options);

/**
 * BusinessScopeGuard - Prevents IDOR attacks by validating resource ownership
 *
 * Validates that a resource (product, customer, order, etc.) belongs to the
 * authenticated user's business before allowing the controller method to execute.
 *
 * Features:
 * - Automatic businessId validation via Prisma lookups
 * - Supports multiple resource types via declarative decorator
 * - Fails closed: throws ForbiddenException if validation fails
 * - Skips validation if no @BusinessScoped() decorator present
 *
 * Security Note:
 * This guard is registered globally but only activates on endpoints with
 * the @BusinessScoped() decorator, allowing granular control while maintaining
 * defense-in-depth for all new endpoints.
 */
@Injectable()
export class BusinessScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<BusinessScopeOptions>(
      BUSINESS_SCOPE_KEY,
      context.getHandler(),
    );

    // No decorator = no validation (allows gradual rollout)
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let user: AuthUser = request.user;

    // When registered as APP_GUARD, this guard may run before JwtAuthGuard.
    // If user is not yet set, try to extract businessId from the JWT token.
    if (!user) {
      const authHeader = request.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice(7);
          const payload = this.jwtService.verify(token);
          user = {
            employeeId: payload.sub,
            businessId: payload.businessId,
            outletId: payload.outletId,
            role: payload.role,
          };
          // Populate request.user so downstream guards/decorators can use it
          request.user = user;
        } catch {
          // Invalid/expired token — let JwtAuthGuard handle the 401
          return true;
        }
      } else {
        // No Authorization header — let JwtAuthGuard handle the 401
        return true;
      }
    }

    if (!user?.businessId) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract resource ID from route params or request body
    const resourceId = request.params[options.param] || request.body?.[options.param];

    if (!resourceId) {
      if (options.optional) {
        return true;
      }
      throw new ForbiddenException(`Missing ${options.param} parameter`);
    }

    // Validate resource ownership
    const isOwner = await this.validateOwnership(options.resource, resourceId, user.businessId);

    if (!isOwner) {
      throw new ForbiddenException(`You do not have access to this ${options.resource}`);
    }

    return true;
  }

  /**
   * Validates that a resource belongs to the specified business
   *
   * @param resource - Resource type (product, customer, etc.)
   * @param resourceId - ID of the resource to validate
   * @param businessId - Business ID from authenticated user
   * @returns true if resource belongs to business, false otherwise
   */
  private async validateOwnership(
    resource: string,
    resourceId: string,
    businessId: string,
  ): Promise<boolean> {
    const table = this.getTableName(resource);

    try {
      // Some resources (order, table) don't have businessId directly;
      // they belong to an outlet which has the businessId.
      const needsOutletJoin = ['order', 'table'].includes(resource);
      const needsProductJoin = ['recipe'].includes(resource);

      // Dynamic Prisma model access requires index signature access
      const delegate = (this.prisma as unknown as Record<string, PrismaDelegate>)[table];

      if (needsOutletJoin) {
        const result = await delegate.findUnique({
          where: { id: resourceId },
          select: { outlet: { select: { businessId: true } } },
        });
        if (!result?.outlet) return false;
        return result.outlet.businessId === businessId;
      }

      if (needsProductJoin) {
        const result = await delegate.findUnique({
          where: { id: resourceId },
          select: { product: { select: { businessId: true } } },
        });
        if (!result?.product) return false;
        return result.product.businessId === businessId;
      }

      const result = await delegate.findUnique({
        where: { id: resourceId },
        select: { businessId: true },
      });

      if (!result) {
        // Resource not found - treat as unauthorized to avoid enumeration
        return false;
      }

      return result.businessId === businessId;
    } catch (error) {
      // Query error (invalid ID format, DB error, etc.) - deny access
      return false;
    }
  }

  /**
   * Maps resource names to Prisma table names
   *
   * @param resource - Resource type from decorator
   * @returns Corresponding Prisma model name
   */
  private getTableName(resource: string): string {
    const tableMap: Record<string, string> = {
      product: 'product',
      customer: 'customer',
      order: 'order',
      table: 'table',
      promotion: 'promotion',
      supplier: 'supplier',
      employee: 'employee',
      outlet: 'outlet',
      category: 'category',
      ingredient: 'ingredient',
      recipe: 'recipe',
      workOrder: 'workOrder',
      modifierGroup: 'modifierGroup',
      loyaltyTier: 'loyaltyTier',
    };

    const tableName = tableMap[resource];
    if (!tableName) {
      throw new Error(`Unknown resource type: ${resource}`);
    }

    return tableName;
  }
}
