export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
  basePrice: number;
  costPrice: number;
  trackStock: boolean;
  imageUrl: string | null;
  isActive: boolean;
  variants: ProductVariant[];
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  businessId: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  basePrice: number;
  costPrice: number;
  trackStock: boolean;
  imageUrl?: string;
  variants?: CreateVariantRequest[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}

export interface CreateVariantRequest {
  name: string;
  sku?: string;
  price: number;
  costPrice: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  isActive?: boolean;
}
