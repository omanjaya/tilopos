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

/** conversionFactor is a Prisma Decimal serialized as a string — convert once here. */
function mapConversion(c: UnitConversion): UnitConversion {
  return { ...c, conversionFactor: Number(c.conversionFactor) };
}

export const unitConversionApi = {
  listByProduct: (productId: string) =>
    apiClient
      .get<{ conversions: UnitConversion[] }>(`/unit-conversions/product/${productId}`)
      .then((r) => r.data.conversions.map(mapConversion)),

  create: (data: Omit<UnitConversion, 'id'>) =>
    apiClient
      .post<{ conversion: UnitConversion }>('/unit-conversions', data)
      .then((r) => mapConversion(r.data.conversion)),

  delete: (id: string) => apiClient.delete(`/unit-conversions/${id}`),
};
