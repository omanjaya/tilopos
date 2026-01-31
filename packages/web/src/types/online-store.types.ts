export interface OnlineStore {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOnlineStoreRequest {
  businessId: string;
  name: string;
  slug: string;
  description?: string;
}
