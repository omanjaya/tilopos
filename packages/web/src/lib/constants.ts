import type { EmployeeRole } from '@/types/auth.types';

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

export const STATUS_OPTIONS = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];
