export interface LoginRequest {
  email: string;
  pin: string;
}

export interface LoginResponse {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  businessId: string;
  outletId: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  role: EmployeeRole;
  businessId: string | null;
  outletId: string | null;
  employeeId: string;
  outletName?: string;
}

export type EmployeeRole =
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'supervisor'
  | 'cashier'
  | 'kitchen'
  | 'inventory';
