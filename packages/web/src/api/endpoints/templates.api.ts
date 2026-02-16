import { apiClient } from '../client';

export interface TemplateSummary {
  type: string;
  label: string;
  description: string;
  icon: string;
  counts: {
    categories: number;
    products: number;
    modifierGroups: number;
    tables: number;
    units: number;
  };
}

export interface TemplateModifierOption {
  name: string;
  price: number;
}

export interface TemplateModifierGroup {
  name: string;
  required: boolean;
  maxSelect: number;
  options: TemplateModifierOption[];
}

export interface TemplateProduct {
  name: string;
  category: string;
  price: number;
  unit: string;
  type: string;
}

export interface TemplateCategory {
  name: string;
  sortOrder: number;
}

export interface TemplateTable {
  name: string;
  capacity: number;
}

export interface TemplateData {
  type: string;
  label: string;
  description: string;
  icon: string;
  categories: TemplateCategory[];
  products: TemplateProduct[];
  modifierGroups: TemplateModifierGroup[];
  units: string[];
  tables: TemplateTable[];
  paymentMethods: string[];
  taxRate: number;
}

export interface ApplyTemplateRequest {
  outletId: string;
  typeCode: string;
  sections: {
    categories?: boolean;
    products?: boolean;
    modifiers?: boolean;
    tables?: boolean;
    units?: boolean;
  };
}

export interface ApplyTemplateResponse {
  categories: number;
  products: number;
  modifierGroups: number;
  modifiers: number;
  tables: number;
}

export const templatesApi = {
  list: () =>
    apiClient.get<TemplateSummary[]>('/templates').then((r) => r.data),

  get: (typeCode: string) =>
    apiClient.get<TemplateData>(`/templates/${typeCode}`).then((r) => r.data),

  apply: (data: ApplyTemplateRequest) =>
    apiClient.post<ApplyTemplateResponse>('/templates/apply', data).then((r) => r.data),
};
