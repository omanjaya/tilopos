export interface Business {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
}

export interface Outlet {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  taxRate: number;
  serviceCharge: number;
  isActive: boolean;
  businessId: string;
}

export interface CreateOutletRequest {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  taxRate?: number;
  serviceCharge?: number;
}

export interface Device {
  id: string;
  deviceName: string;
  deviceType: string;
  platform: string | null;
  deviceIdentifier: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastActiveAt: string | null;
  outletId: string | null;
  createdAt: string;
}

export interface NotificationSetting {
  id: string;
  type: string;
  channel: string;
  isEnabled: boolean;
  businessId: string;
}

export interface NotificationLog {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Tax Settings
export interface TaxConfig {
  id: string;
  taxRate: number;
  serviceChargeRate: number;
  isTaxInclusive: boolean;
  taxExemptionRules: TaxExemptionRule[];
  businessId: string;
}

export interface TaxExemptionRule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface UpdateTaxConfigRequest {
  taxRate?: number;
  serviceChargeRate?: number;
  isTaxInclusive?: boolean;
  taxExemptionRules?: Omit<TaxExemptionRule, 'id'>[];
}

// Receipt Template
export interface ReceiptTemplate {
  id: string;
  showLogo: boolean;
  showAddress: boolean;
  showTaxBreakdown: boolean;
  showBarcode: boolean;
  showQrCode: boolean;
  headerText: string;
  footerText: string;
  paperSize: '58mm' | '80mm';
  businessId: string;
}

export interface UpdateReceiptTemplateRequest {
  showLogo?: boolean;
  showAddress?: boolean;
  showTaxBreakdown?: boolean;
  showBarcode?: boolean;
  showQrCode?: boolean;
  headerText?: string;
  footerText?: string;
  paperSize?: '58mm' | '80mm';
}

// Operating Hours
export interface OperatingHours {
  id: string;
  schedule: DaySchedule[];
  specialHours: SpecialHour[];
  businessId: string;
}

export interface DaySchedule {
  day: string;
  dayLabel: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface SpecialHour {
  id: string;
  name: string;
  date: string;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface UpdateOperatingHoursRequest {
  schedule?: Omit<DaySchedule, 'dayLabel'>[];
  specialHours?: Omit<SpecialHour, 'id'>[];
}

// Modifier Groups
export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
  businessId: string;
  createdAt: string;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateModifierGroupRequest {
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Omit<Modifier, 'id'>[];
}

export type UpdateModifierGroupRequest = Partial<CreateModifierGroupRequest>;

