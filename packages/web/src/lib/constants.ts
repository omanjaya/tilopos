import type { EmployeeRole } from '@/types/auth.types';
import { canManageRole } from '@/config/permissions';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Kasir',
  kitchen: 'Staf Dapur',
  inventory: 'Staf Inventaris',
};

export const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'cashier', label: 'Kasir' },
  { value: 'kitchen', label: 'Staf Dapur' },
  { value: 'inventory', label: 'Staf Inventaris' },
];

/**
 * Role options the caller may assign (backend canManageRole: strictly below the
 * caller's own rank). Use this in employee forms/filters that create or edit.
 */
export function assignableRoleOptions(callerRole: string | undefined): { value: EmployeeRole; label: string }[] {
  return ROLE_OPTIONS.filter((opt) => canManageRole(callerRole, opt.value));
}

export const STATUS_OPTIONS = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];
