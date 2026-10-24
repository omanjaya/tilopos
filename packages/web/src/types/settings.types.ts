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
  /** Backend NotificationLog.title (preferred over a type-derived label). */
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Tax Settings
/** GET /settings/tax (business-level, settings.dto.ts TaxConfigResponse). */
export interface TaxConfig {
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  isTaxInclusive: boolean;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
}

/** PUT /settings/tax (UpdateTaxConfigDto). */
export interface UpdateTaxConfigRequest {
  taxEnabled?: boolean;
  taxRate?: number;
  taxName?: string;
  isTaxInclusive?: boolean;
  serviceChargeEnabled?: boolean;
  serviceChargeRate?: number;
}

// Receipt Template
/** GET /settings/receipt (OutletReceiptTemplate). */
export interface ReceiptTemplate {
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  headerText: string;
  footerText: string;
  paperSize: '58mm' | '80mm';
}

/** PUT /settings/receipt (UpdateReceiptTemplateDto). */
export interface UpdateReceiptTemplateRequest {
  showLogo?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTaxBreakdown?: boolean;
  showPaymentMethod?: boolean;
  headerText?: string;
  footerText?: string;
  paperSize?: '58mm' | '80mm';
}

// Operating Hours
export interface OperatingHours {
  outletId: string;
  schedule: DaySchedule[];
}

export interface DaySchedule {
  day: string;
  dayLabel: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface UpdateOperatingHoursRequest {
  schedule: Omit<DaySchedule, 'dayLabel'>[];
}

// Modifier Groups
export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  /** null = no upper bound */
  maxSelections: number | null;
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

/** Modifier line sent to the backend (ModifierInputDto: name + price; id only on update). */
export interface ModifierInput {
  id?: string;
  name: string;
  price: number;
}

export interface CreateModifierGroupRequest {
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections?: number | null;
  modifiers: ModifierInput[];
}

export interface UpdateModifierGroupRequest {
  name?: string;
  isActive?: boolean;
  isRequired?: boolean;
  minSelections?: number;
  /** null clears the upper bound */
  maxSelections?: number | null;
  /** Full list when present (missing modifiers are deactivated). */
  modifiers?: ModifierInput[];
}

// Payment Methods
export type PaymentMethodType = 'cash' | 'card' | 'ewallet' | 'qris' | 'bank_transfer';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
  processingFee: number;
  settings: Record<string, unknown>;
}

export interface CreatePaymentMethodRequest {
  name: string;
  type: PaymentMethodType;
  isActive?: boolean;
  processingFee?: number;
  settings?: Record<string, unknown>;
}

export type UpdatePaymentMethodRequest = Partial<CreatePaymentMethodRequest>;

// Printer Configuration
export type PrinterType = 'receipt' | 'kitchen' | 'label';
export type PrinterConnection = 'usb' | 'network' | 'bluetooth';

export interface PrinterConfig {
  id: string;
  name: string;
  type: PrinterType;
  connection: PrinterConnection;
  ipAddress: string | null;
  port: number | null;
  isActive: boolean;
  autoPrint: boolean;
  copies: number;
  outletId: string;
}

export interface CreatePrinterConfigRequest {
  name: string;
  type: PrinterType;
  connection: PrinterConnection;
  ipAddress?: string;
  port?: number;
  autoPrint?: boolean;
  copies?: number;
  outletId: string;
}

export type UpdatePrinterConfigRequest = Partial<CreatePrinterConfigRequest> & { isActive?: boolean };

// Report Schedule
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportType = 'sales' | 'financial' | 'inventory';

export interface ReportSchedule {
  id: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  recipients: string[];
  isActive: boolean;
  nextSendAt: string | null;
  lastSentAt: string | null;
  lastStatus?: 'pending' | 'processing' | 'sent' | 'failed' | 'unknown';
  lastError?: string | null;
  lastAttemptAt?: string | null;
  deliveryConfigured: boolean;
}

export interface CreateReportScheduleRequest {
  reportType: ReportType;
  frequency: ReportFrequency;
  recipients: string[];
  isActive?: boolean;
}

export type UpdateReportScheduleRequest = Partial<CreateReportScheduleRequest>;

