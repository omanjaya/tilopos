import { useAuthStore } from '@/stores/auth.store';
import { can, canAccessPath, hasRole } from '@/config/permissions';
import type { Action, RoleGroup } from '@/config/permissions';

/** True when the current user may perform `action` (see ACTION_ROLES). */
export function useCan(action: Action): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return can(role, action);
}

/** True when the current user belongs to `group`. */
export function useHasRole(group: RoleGroup): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return hasRole(role, group);
}

/** True when the current user may open `path` (see ROUTE_ROLES). */
export function useCanAccessPath(path: string): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return canAccessPath(role, path);
}
