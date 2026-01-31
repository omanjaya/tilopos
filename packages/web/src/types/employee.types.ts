import type { EmployeeRole } from './auth.types';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: EmployeeRole;
  outletId: string;
  outletName: string;
  hourlyRate: number | null;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone?: string;
  pin: string;
  role: EmployeeRole;
  outletId: string;
  hourlyRate?: number;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  pin?: string;
  role?: EmployeeRole;
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
