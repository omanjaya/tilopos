export interface BusinessRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutletRecord {
  id: string;
  businessId: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  taxRate: number;
  serviceCharge: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModifierGroupRecord {
  id: string;
  businessId: string;
  name: string;
  selectionType: string;
  minSelection: number;
  maxSelection: number | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyProgramRecord {
  id: string;
  businessId: string;
  name: string;
  amountPerPoint: number;
  redemptionRate: number;
  pointExpiryDays: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTierRecord {
  id: string;
  businessId: string;
  name: string;
  minPoints: number;
  minSpent: number;
  pointMultiplier: number;
  benefits: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBusinessData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
}

export interface CreateOutletData {
  businessId: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  taxRate?: number;
  serviceCharge?: number;
}

export interface CreateModifierGroupData {
  businessId: string;
  name: string;
  selectionType: string;
  minSelection: number;
  maxSelection: number | null;
  isRequired: boolean;
  modifiers: { name: string; price: number }[];
}

export interface UpdateModifierGroupData {
  name?: string;
  isActive?: boolean;
  selectionType?: string;
  minSelection?: number;
  maxSelection?: number | null;
  isRequired?: boolean;
  /** Full replacement list: with id = update, without id = create, missing = deactivated. */
  modifiers?: { id?: string; name: string; price: number }[];
}

export interface CreateLoyaltyProgramData {
  businessId: string;
  name: string;
  amountPerPoint: number;
  redemptionRate: number;
  pointExpiryDays?: number | null;
}

export interface UpdateLoyaltyProgramData {
  name?: string;
  amountPerPoint?: number;
  redemptionRate?: number;
  pointExpiryDays?: number | null;
  isActive?: boolean;
}

export interface CreateLoyaltyTierData {
  businessId: string;
  name: string;
  minPoints: number;
  minSpent?: number;
  pointMultiplier: number;
  benefits?: string[];
  sortOrder?: number;
}

export interface UpdateLoyaltyTierData {
  name?: string;
  minPoints?: number;
  minSpent?: number;
  pointMultiplier?: number;
  benefits?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export interface TaxConfig {
  outletId: string;
  taxRate: number;
  serviceCharge: number;
  taxInclusive: boolean;
  taxName: string;
  taxNumber?: string;
}

export interface UpdateTaxConfigData {
  taxRate?: number;
  serviceCharge?: number;
  taxInclusive?: boolean;
  taxName?: string;
  taxNumber?: string;
}

export interface ReceiptTemplate {
  outletId: string;
  header: string;
  footer: string;
  showLogo: boolean;
  logoUrl?: string;
  showQRCode: boolean;
  showTaxDetails: boolean;
  showServiceCharge: boolean;
  paperSize: '58mm' | '80mm';
  fontSize: 'small' | 'medium' | 'large';
}

export interface UpdateReceiptTemplateData {
  header?: string;
  footer?: string;
  showLogo?: boolean;
  logoUrl?: string;
  showQRCode?: boolean;
  showTaxDetails?: boolean;
  showServiceCharge?: boolean;
  paperSize?: '58mm' | '80mm';
  fontSize?: 'small' | 'medium' | 'large';
}

export interface OperatingHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  isOpen: boolean;
  openTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  breakStart?: string;
  breakEnd?: string;
}

export interface OperatingHoursData {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface PaymentMethodConfig {
  method: string;
  enabled: boolean;
  displayName: string;
  processingFee?: number;
  feeType?: 'percentage' | 'fixed';
  minAmount?: number;
  maxAmount?: number;
  sortOrder?: number;
}

// ==================== Business Tax Config ====================

export interface BusinessTaxConfig {
  taxEnabled: boolean;
  taxRate: number;
  taxName: string;
  taxInclusive: boolean;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
}

export interface UpdateBusinessTaxConfigData {
  taxEnabled?: boolean;
  taxRate?: number;
  taxName?: string;
  taxInclusive?: boolean;
  serviceChargeEnabled?: boolean;
  serviceChargeRate?: number;
}

// ==================== Outlet Receipt Template ====================

export type PaperWidthType = '58mm' | '80mm';

export interface OutletReceiptTemplate {
  header: string;
  footer: string;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTaxDetails: boolean;
  showPaymentMethod: boolean;
  paperWidth: PaperWidthType;
  customMessage: string;
}

export interface UpdateOutletReceiptTemplateData {
  header?: string;
  footer?: string;
  showLogo?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTaxDetails?: boolean;
  showPaymentMethod?: boolean;
  paperWidth?: PaperWidthType;
  customMessage?: string;
}

// ==================== Outlet Operating Hours ====================

export interface OutletOperatingHoursEntry {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

// ==================== Business Payment Methods ====================

export type PaymentMethodType = 'cash' | 'card' | 'ewallet' | 'qris' | 'bank_transfer';

export interface BusinessPaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
  processingFee: number;
  settings: Record<string, unknown>;
}

export interface CreateBusinessPaymentMethodData {
  name: string;
  type: PaymentMethodType;
  isActive?: boolean;
  processingFee?: number;
  settings?: Record<string, unknown>;
}

export interface UpdateBusinessPaymentMethodData {
  name?: string;
  type?: PaymentMethodType;
  isActive?: boolean;
  processingFee?: number;
  settings?: Record<string, unknown>;
}

// ==================== Printer Configs ====================

export interface PrinterConfigRecord {
  id: string;
  name: string;
  type: 'receipt' | 'kitchen' | 'label';
  connection: 'usb' | 'network' | 'bluetooth';
  ipAddress: string | null;
  port: number | null;
  isActive: boolean;
  autoPrint: boolean;
  copies: number;
  outletId: string;
}

export interface CreatePrinterConfigInput {
  name: string;
  type: 'receipt' | 'kitchen' | 'label';
  connection: 'usb' | 'network' | 'bluetooth';
  ipAddress?: string;
  port?: number;
  autoPrint?: boolean;
  copies?: number;
  outletId: string;
}

export interface UpdatePrinterConfigInput {
  name?: string;
  type?: 'receipt' | 'kitchen' | 'label';
  connection?: 'usb' | 'network' | 'bluetooth';
  ipAddress?: string;
  port?: number;
  isActive?: boolean;
  autoPrint?: boolean;
  copies?: number;
  outletId?: string;
}

// ==================== Report Schedules ====================

export interface ReportScheduleRecord {
  id: string;
  reportType: 'sales' | 'financial' | 'inventory';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive: boolean;
  nextSendAt: string | null;
  lastSentAt: string | null;
  lastStatus?: 'pending' | 'processing' | 'sent' | 'failed' | 'unknown';
  lastError?: string | null;
  lastAttemptAt?: string | null;
}

export interface CreateReportScheduleInput {
  reportType: 'sales' | 'financial' | 'inventory';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive?: boolean;
}

export interface UpdateReportScheduleInput {
  reportType?: 'sales' | 'financial' | 'inventory';
  frequency?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  isActive?: boolean;
}
