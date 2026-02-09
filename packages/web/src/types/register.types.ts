export interface RegisterRequest {
  ownerName: string;
  email: string;
  pin: string;
  confirmPin: string;
  phone?: string;
  businessType: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  outletName: string;
  outletCode?: string;
  outletAddress?: string;
  taxRate?: number;
}

export interface RegisterResponse {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: string;
  businessId: string;
  outletId: string;
  businessType: string;
  featuresEnabled: number;
  enabledFeatures: string[];
}

export interface BusinessTypePresetPublic {
  code: string;
  label: string;
  description: string;
  icon: string;
  category: 'fnb' | 'retail' | 'service' | 'wholesale' | 'custom';
  examples: string[];
  defaultFeatures: string[];
  optionalFeatures: string[];
}
