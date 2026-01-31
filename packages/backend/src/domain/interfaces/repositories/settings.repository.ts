export interface ISettingsRepository {
  findBusiness(businessId: string): Promise<any>;
  updateBusiness(businessId: string, data: UpdateBusinessData): Promise<any>;
  findOutlets(businessId: string): Promise<any[]>;
  findOutletById(id: string): Promise<any | null>;
  createOutlet(data: CreateOutletData): Promise<any>;
  updateOutlet(id: string, data: Record<string, unknown>): Promise<any>;
  deleteOutlet(id: string): Promise<void>;
  findModifierGroups(businessId: string): Promise<any[]>;
  createModifierGroup(data: CreateModifierGroupData): Promise<any>;
  updateModifierGroup(id: string, data: UpdateModifierGroupData): Promise<any>;
  deleteModifierGroup(id: string): Promise<void>;
  findLoyaltyProgram(businessId: string): Promise<any | null>;
  createLoyaltyProgram(data: CreateLoyaltyProgramData): Promise<any>;
  updateLoyaltyProgram(businessId: string, data: UpdateLoyaltyProgramData): Promise<any>;
  findLoyaltyTiers(businessId: string): Promise<any[]>;
  createLoyaltyTier(data: CreateLoyaltyTierData): Promise<any>;
  updateLoyaltyTier(id: string, data: UpdateLoyaltyTierData): Promise<any>;
  deleteLoyaltyTier(id: string): Promise<void>;
  // Tax Configuration
  getTaxConfig(outletId: string): Promise<TaxConfig>;
  updateTaxConfig(outletId: string, data: UpdateTaxConfigData): Promise<any>;
  getBusinessTaxConfig(businessId: string): Promise<BusinessTaxConfig>;
  updateBusinessTaxConfig(businessId: string, data: UpdateBusinessTaxConfigData): Promise<BusinessTaxConfig>;
  // Receipt Template
  getReceiptTemplate(outletId: string): Promise<ReceiptTemplate>;
  updateReceiptTemplate(outletId: string, data: UpdateReceiptTemplateData): Promise<any>;
  getOutletReceiptTemplate(outletId: string): Promise<OutletReceiptTemplate>;
  updateOutletReceiptTemplate(outletId: string, data: UpdateOutletReceiptTemplateData): Promise<OutletReceiptTemplate>;
  // Operating Hours
  getOperatingHours(outletId: string): Promise<OperatingHours[]>;
  updateOperatingHours(outletId: string, data: OperatingHoursData[]): Promise<void>;
  getOutletOperatingHours(outletId: string): Promise<OutletOperatingHoursEntry[]>;
  updateOutletOperatingHours(outletId: string, data: OutletOperatingHoursEntry[]): Promise<OutletOperatingHoursEntry[]>;
  // Payment Methods
  getPaymentMethods(businessId: string): Promise<PaymentMethodConfig[]>;
  updatePaymentMethods(businessId: string, data: PaymentMethodConfig[]): Promise<void>;
  getBusinessPaymentMethods(businessId: string): Promise<BusinessPaymentMethod[]>;
  createBusinessPaymentMethod(businessId: string, data: CreateBusinessPaymentMethodData): Promise<BusinessPaymentMethod>;
  updateBusinessPaymentMethod(businessId: string, id: string, data: UpdateBusinessPaymentMethodData): Promise<BusinessPaymentMethod>;
  deleteBusinessPaymentMethod(businessId: string, id: string): Promise<void>;
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
