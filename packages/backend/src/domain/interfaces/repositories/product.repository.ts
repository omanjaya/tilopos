export interface IProductRepository {
  findById(id: string): Promise<ProductRecord | null>;
  findByBusinessId(businessId: string): Promise<ProductRecord[]>;
  findByCategoryId(categoryId: string): Promise<ProductRecord[]>;
  findBySku(businessId: string, sku: string): Promise<ProductRecord | null>;
  save(product: ProductRecord): Promise<ProductRecord>;
  update(id: string, data: Partial<ProductRecord>): Promise<ProductRecord>;
  delete(id: string): Promise<void>;
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
}
