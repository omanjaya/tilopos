import { apiClient } from '../client';

export interface UnitConversion {
  id: string;
  productId: string;
  fromUnit: string;
  fromUnitLabel: string;
  toUnit: string;
  toUnitLabel: string;
  conversionFactor: number;
  isDefault: boolean;
}

export interface ConvertedQuantity {
  fromQuantity: number;
  fromUnit: string;
  fromUnitLabel: string;
  toQuantity: number;
  toUnit: string;
  toUnitLabel: string;
}

export interface StockInUnits {
  baseQuantity: number;
  conversions: {
    unit: string;
    unitLabel: string;
    wholeUnits: number;
    remainder: number;
    remainderUnit: string;
    remainderUnitLabel: string;
    totalInBaseUnit: number;
  }[];
}

export const unitConversionApi = {
  listByProduct: (productId: string) =>
    apiClient.get<{ conversions: UnitConversion[] }>(`/unit-conversions/product/${productId}`).then((r) => r.data.conversions),

  create: (data: Omit<UnitConversion, 'id'>) =>
    apiClient.post<{ conversion: UnitConversion }>('/unit-conversions', data).then((r) => r.data.conversion),

  update: (id: string, data: Partial<UnitConversion>) =>
    apiClient.put<{ conversion: UnitConversion }>(`/unit-conversions/${id}`, data).then((r) => r.data.conversion),

  delete: (id: string) => apiClient.delete(`/unit-conversions/${id}`),

  convert: (productId: string, quantity: number, from: string, to: string) =>
    apiClient
      .get<ConvertedQuantity>(`/unit-conversions/convert/${productId}?quantity=${quantity}&from=${from}&to=${to}`)
      .then((r) => r.data),

  getStockInAllUnits: (productId: string, outletId: string) =>
    apiClient.get<StockInUnits>(`/unit-conversions/stock/${productId}/${outletId}`).then((r) => r.data),
};
