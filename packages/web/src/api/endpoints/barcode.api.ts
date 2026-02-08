import { apiClient } from '../client';

export interface BarcodeLookupResult {
  found: boolean;
  type: 'product' | 'variant';
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    basePrice: number;
    costPrice: number | null;
    hasVariants: boolean;
    category: { name: string } | null;
    variants: {
      id: string;
      name: string;
      sku: string | null;
      barcode: string | null;
      price: number;
    }[];
    priceTiers: {
      id: string;
      tierName: string;
      minQuantity: number;
      maxQuantity: number | null;
      price: number;
    }[];
  };
  variant: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: number;
  } | null;
}

export const barcodeApi = {
  lookup: (code: string) =>
    apiClient.get<BarcodeLookupResult>(`/inventory/products/barcode/${encodeURIComponent(code)}`).then((r) => r.data),
};
