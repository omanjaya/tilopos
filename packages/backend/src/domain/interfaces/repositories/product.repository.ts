export interface IProductRepository {
  findById(id: string, businessId: string): Promise<ProductRecord | null>;
  findByBusinessId(businessId: string): Promise<ProductRecord[]>;
  findBySku(businessId: string, sku: string): Promise<ProductRecord | null>;
  save(product: ProductRecord): Promise<ProductRecord>;
  update(id: string, data: Partial<ProductRecord>, businessId: string): Promise<ProductRecord>;
  delete(id: string, businessId: string): Promise<void>;
}

export interface ProductVariantRecord {
  id: string;
  productId: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  price: number;
  costPrice: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductRecord {
  id: string;
  businessId: string;
  categoryId: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  costPrice: number | null;
  hasVariants: boolean;
  trackStock: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariantRecord[];
}
