import { apiClient } from '../client';
import type {
  OnlineStore,
  CreateOnlineStoreRequest,
  Storefront,
  StorefrontSocialLinks,
  CreateStorefrontOrderRequest,
  StorefrontOrderResult,
} from '@/types/online-store.types';

/** Prisma OnlineStore row as returned by GET/POST /online-store/stores. */
interface OnlineStoreRow {
  id: string;
  businessId: string;
  storeName: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Backend StorefrontData (modules/online-store/interfaces/storefront.interface.ts). */
interface StorefrontDataResponse {
  store: {
    id: string;
    storeName: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    socialLinks: unknown;
    isDeliveryEnabled: boolean;
    isPickupEnabled: boolean;
  };
  categories: { id: string; name: string; imageUrl: string | null; productCount: number }[];
  products: {
    id: string;
    name: string;
    description: string | null;
    basePrice: number;
    imageUrl: string | null;
    categoryId: string | null;
    categoryName: string | null;
    variants: { id: string; name: string; price: number }[];
    inStock: boolean;
  }[];
}

function toOnlineStore(row: OnlineStoreRow): OnlineStore {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.storeName,
    slug: row.slug,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/** socialLinks is free-form JSON on the store; read the known keys defensively. */
function toSocialLinks(raw: unknown): StorefrontSocialLinks {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  return {
    instagram: pickString(obj, 'instagram', 'instagramUrl'),
    facebook: pickString(obj, 'facebook', 'facebookUrl'),
    whatsapp: pickString(obj, 'whatsapp', 'whatsappNumber'),
  };
}

export function mapStorefront(data: StorefrontDataResponse): Storefront {
  return {
    id: data.store.id,
    name: data.store.storeName,
    slug: data.store.slug,
    description: data.store.description,
    logo: data.store.logoUrl,
    banner: data.store.bannerUrl,
    socialLinks: toSocialLinks(data.store.socialLinks),
    isDeliveryEnabled: data.store.isDeliveryEnabled,
    isPickupEnabled: data.store.isPickupEnabled,
    categories: data.categories,
    products: data.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      price: Number(p.basePrice),
      isAvailable: p.inStock,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      variants: (p.variants ?? []).map((v) => ({ id: v.id, name: v.name, price: Number(v.price) })),
    })),
  };
}

export const onlineStoreApi = {
  // Admin endpoints
  getStores: () =>
    apiClient.get<OnlineStoreRow[]>('/online-store/stores').then((r) => {
      if (!Array.isArray(r.data)) {
        throw new Error('Respons daftar toko online tidak valid');
      }
      return r.data.map(toOnlineStore);
    }),

  createStore: (data: CreateOnlineStoreRequest) =>
    apiClient
      .post<OnlineStoreRow>('/online-store/stores', {
        storeName: data.name,
        slug: data.slug,
        description: data.description,
      })
      .then((r) => toOnlineStore(r.data)),

  // Customer storefront endpoints (public)
  getStorefront: (slug: string) =>
    apiClient
      .get<StorefrontDataResponse>(`/online-store/s/${encodeURIComponent(slug)}/storefront`)
      .then((r) => mapStorefront(r.data)),

  createOrder: (slug: string, data: CreateStorefrontOrderRequest) =>
    apiClient
      .post<StorefrontOrderResult>(`/online-store/s/${encodeURIComponent(slug)}/checkout`, data)
      .then((r) => r.data),
};
