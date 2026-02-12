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

export interface ISettingsRepository {
  findBusiness(businessId: string): Promise<BusinessRecord>;
  updateBusiness(businessId: string, data: UpdateBusinessData): Promise<BusinessRecord>;
  findOutlets(businessId: string): Promise<OutletRecord[]>;
  findOutletById(id: string): Promise<OutletRecord | null>;
  createOutlet(data: CreateOutletData): Promise<OutletRecord>;
  updateOutlet(id: string, data: Record<string, unknown>): Promise<OutletRecord>;
  deleteOutlet(id: string): Promise<void>;
  findModifierGroups(businessId: string): Promise<ModifierGroupRecord[]>;
  createModifierGroup(data: CreateModifierGroupData): Promise<ModifierGroupRecord>;
  updateModifierGroup(id: string, data: UpdateModifierGroupData): Promise<ModifierGroupRecord>;
  deleteModifierGroup(id: string): Promise<void>;
  findLoyaltyProgram(businessId: string): Promise<LoyaltyProgramRecord | null>;
  createLoyaltyProgram(data: CreateLoyaltyProgramData): Promise<LoyaltyProgramRecord>;
  updateLoyaltyProgram(
    businessId: string,
    data: UpdateLoyaltyProgramData,
  ): Promise<LoyaltyProgramRecord>;
  findLoyaltyTiers(businessId: string): Promise<LoyaltyTierRecord[]>;
  createLoyaltyTier(data: CreateLoyaltyTierData): Promise<LoyaltyTierRecord>;
  updateLoyaltyTier(id: string, data: UpdateLoyaltyTierData): Promise<LoyaltyTierRecord>;
  deleteLoyaltyTier(id: string): Promise<void>;
  // Tax Configuration
  getTaxConfig(outletId: string): Promise<TaxConfig>;
  updateTaxConfig(outletId: string, data: UpdateTaxConfigData): Promise<TaxConfig>;
  getBusinessTaxConfig(businessId: string): Promise<BusinessTaxConfig>;
  updateBusinessTaxConfig(
    businessId: string,
    data: UpdateBusinessTaxConfigData,
  ): Promise<BusinessTaxConfig>;
  // Receipt Template
  getReceiptTemplate(outletId: string): Promise<ReceiptTemplate>;
  updateReceiptTemplate(
    outletId: string,
    data: UpdateReceiptTemplateData,
  ): Promise<ReceiptTemplate>;
  getOutletReceiptTemplate(outletId: string): Promise<OutletReceiptTemplate>;
  updateOutletReceiptTemplate(
    outletId: string,
    data: UpdateOutletReceiptTemplateData,
  ): Promise<OutletReceiptTemplate>;
  // Operating Hours
  getOperatingHours(outletId: string): Promise<OperatingHours[]>;
  updateOperatingHours(outletId: string, data: OperatingHoursData[]): Promise<void>;
  getOutletOperatingHours(outletId: string): Promise<OutletOperatingHoursEntry[]>;
  updateOutletOperatingHours(
    outletId: string,
    data: OutletOperatingHoursEntry[],
  ): Promise<OutletOperatingHoursEntry[]>;
  // Payment Methods
  getPaymentMethods(businessId: string): Promise<PaymentMethodConfig[]>;
  updatePaymentMethods(businessId: string, data: PaymentMethodConfig[]): Promise<void>;
  getBusinessPaymentMethods(businessId: string): Promise<BusinessPaymentMethod[]>;
  createBusinessPaymentMethod(
    businessId: string,
    data: CreateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod>;
  updateBusinessPaymentMethod(
    businessId: string,
    id: string,
    data: UpdateBusinessPaymentMethodData,
  ): Promise<BusinessPaymentMethod>;
  deleteBusinessPaymentMethod(businessId: string, id: string): Promise<void>;
  // Printer Configs
  getPrinterConfigs(businessId: string): Promise<PrinterConfigRecord[]>;
  createPrinterConfig(businessId: string, data: CreatePrinterConfigInput): Promise<PrinterConfigRecord>;
  updatePrinterConfig(businessId: string, id: string, data: UpdatePrinterConfigInput): Promise<PrinterConfigRecord>;
  deletePrinterConfig(businessId: string, id: string): Promise<void>;
  // Report Schedules
  getReportSchedules(businessId: string): Promise<ReportScheduleRecord[]>;
  createReportSchedule(businessId: string, data: CreateReportScheduleInput): Promise<ReportScheduleRecord>;
  updateReportSchedule(businessId: string, id: string, data: UpdateReportScheduleInput): Promise<ReportScheduleRecord>;
  deleteReportSchedule(businessId: string, id: string): Promise<void>;
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
