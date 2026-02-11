import { Injectable, ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../constants/roles';

/**
 * OutletAccessGuard - Helper to enforce outlet-level data isolation
 *
 * Rules:
 * - OWNER and SUPER_ADMIN can access all outlets in their business
 * - Other roles can only access their assigned outlet
 *
 * Usage:
 * ```ts
 * OutletAccessGuard.enforceOutletAccess(user, targetOutletId);
 * const filteredOutletId = OutletAccessGuard.getAccessibleOutletId(user, requestedOutletId);
 * ```
 */
@Injectable()
export class OutletAccessGuard {
  /**
   * Check if user can bypass outlet restrictions (owner/super_admin)
   */
  static canAccessAllOutlets(user: AuthUser): boolean {
    return user.role === EmployeeRole.OWNER || user.role === EmployeeRole.SUPER_ADMIN;
  }

  /**
   * Enforce outlet access - throws if user cannot access the target outlet
   * @param user - Current authenticated user
   * @param targetOutletId - The outlet being accessed (can be null for business-wide data)
   * @param resourceName - Name of resource for error message (e.g., 'employee', 'shift')
   */
  static enforceOutletAccess(
    user: AuthUser,
    targetOutletId: string | null | undefined,
    resourceName = 'resource',
  ): void {
    // Owner and super_admin can access all outlets
    if (this.canAccessAllOutlets(user)) {
      return;
    }

    // Non-owner must have an assigned outlet
    if (!user.outletId) {
      throw new ForbiddenException(`You must be assigned to an outlet to access ${resourceName}s`);
    }

    // If target outlet is specified, it must match user's outlet
    if (targetOutletId && targetOutletId !== user.outletId) {
      throw new ForbiddenException(
        `You can only access ${resourceName}s from your assigned outlet`,
      );
    }
  }

  /**
   * Get the outlet ID to filter queries by
   * - If user is owner/super_admin: returns requestedOutletId (can be undefined to see all)
   * - If user is non-owner: returns user.outletId (enforces their outlet)
   *
   * @param user - Current authenticated user
   * @param requestedOutletId - Optional outlet ID from query/param
   * @returns The outlet ID to use for filtering, or undefined to see all (owner only)
   */
  static getAccessibleOutletId(user: AuthUser, requestedOutletId?: string): string | undefined {
    // Owner/super_admin can request specific outlet or see all
    if (this.canAccessAllOutlets(user)) {
      return requestedOutletId;
    }

    // Non-owner must use their assigned outlet
    return user.outletId || undefined;
  }

  /**
   * Build a Prisma where clause for outlet filtering
   * - If outletId is provided: filters by that outlet
   * - If outletId is undefined: no outlet filter (owner seeing all)
   *
   * @param outletId - Outlet ID from getAccessibleOutletId()
   * @returns Prisma where clause fragment
   */
  static buildOutletFilter(outletId?: string): { outletId?: string } {
    return outletId ? { outletId } : {};
  }
}
