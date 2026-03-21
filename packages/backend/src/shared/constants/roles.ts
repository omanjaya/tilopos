export enum EmployeeRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  CASHIER = 'cashier',
  KITCHEN = 'kitchen',
  INVENTORY = 'inventory',
}

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 7,
  owner: 6,
  manager: 5,
  supervisor: 4,
  cashier: 2,
  kitchen: 1,
  inventory: 1,
};

export function canManageRole(managerRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[managerRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
}
