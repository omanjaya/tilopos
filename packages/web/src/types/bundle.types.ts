export interface BundlePackage {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  costPrice: number | null;
  isActive: boolean;
  items: BundlePackageItem[];
  outlets: BundlePackageOutlet[];
  createdAt: string;
  updatedAt: string;
}

export interface BundlePackageItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  sortOrder: number;
  product: { id: string; name: string; imageUrl?: string | null };
  variant: { id: string; name: string } | null;
}

export interface BundlePackageOutlet {
  id: string;
  bundleId: string;
  outletId: string;
  isActive: boolean;
  outlet: { id: string; name: string };
}

export interface CreateBundleRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  costPrice?: number;
  isActive?: boolean;
  items: { productId: string; variantId?: string; quantity: number; sortOrder?: number }[];
  outletIds?: string[];
}

export type UpdateBundleRequest = Partial<CreateBundleRequest>;
