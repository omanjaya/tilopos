import type { EmployeeRole } from './auth.types';

/** Roles assignable via the employee form (excludes super_admin) */
export type AssignableRole = Exclude<EmployeeRole, 'super_admin'>;

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  /** null for owners without an assigned outlet */
  outletId: string | null;
  outletName: string;
  hourlyRate: number | null;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

/** POST /employees (CreateEmployeeDto). PIN is exactly 6 digits; backend rejects role 'owner'. */
export interface CreateEmployeeRequest {
  name: string;
  email?: string;
  phone?: string;
  pin?: string;
  role: AssignableRole;
  /** Required unless the caller is an owner (400 otherwise). */
  outletId?: string;
  hourlyRate?: number;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  pin?: string;
  role?: AssignableRole;
  outletId?: string;
  hourlyRate?: number;
  isActive?: boolean;
}

export interface Outlet {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  businessId: string;
  isActive: boolean;
}
