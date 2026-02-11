export interface TransferTemplate {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  sourceOutletId: string;
  destinationOutletId: string;
  sourceOutletName?: string;
  destinationOutletName?: string;
  items: TransferTemplateItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface TransferTemplateItem {
  id: string;
  templateId: string;
  productId: string | null;
  variantId: string | null;
  ingredientId: string | null;
  itemName: string;
  defaultQuantity: number;
}

export interface CreateTransferTemplateRequest {
  name: string;
  description?: string;
  sourceOutletId: string;
  destinationOutletId: string;
  items: {
    productId?: string;
    variantId?: string;
    ingredientId?: string;
    itemName: string;
    defaultQuantity: number;
  }[];
}

export interface UpdateTransferTemplateRequest {
  name?: string;
  description?: string;
  sourceOutletId?: string;
  destinationOutletId?: string;
  items?: {
    productId?: string;
    variantId?: string;
    ingredientId?: string;
    itemName: string;
    defaultQuantity: number;
  }[];
}
