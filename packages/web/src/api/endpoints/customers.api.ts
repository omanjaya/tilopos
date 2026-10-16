import { apiClient } from '../client';
import type { PaginationParams, PaginatedResponse } from '@/types/api.types';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerSegmentsResponse,
  SegmentCode,
  SegmentCustomer,
} from '@/types/customer.types';

/** Row of GET /customers (Decimals/counters normalised to numbers). */
function normalize(c: Customer): Customer {
  return {
    ...c,
    totalSpent: Number(c.totalSpent ?? 0),
    loyaltyPoints: Number(c.loyaltyPoints ?? 0),
    visitCount: Number(c.visitCount ?? 0),
  };
}

/** GET /customers with page/limit → { data, meta } (server-side search, ordered by name). */
interface CustomerPage {
  data: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const customersApi = {
  /**
   * GET /customers without page/limit → plain array (active customers, max 1000,
   * ordered by name). Used by the POS customer pickers.
   */
  list: async (params?: { search?: string }): Promise<Customer[]> => {
    const search = params?.search?.trim();
    const r = await apiClient.get<Customer[]>('/customers', { params: search ? { search } : {} });
    if (!Array.isArray(r.data)) {
      throw new Error('Format respons daftar pelanggan tidak valid');
    }
    return r.data.map(normalize);
  },

  /**
   * GET /customers?page&limit(<=100)&search → { data, meta }. The server always
   * orders by name; sortBy/sortOrder are not supported and are not sent.
   */
  listPaginated: async (params?: PaginationParams): Promise<PaginatedResponse<Customer>> => {
    const search = params?.search?.trim();
    const r = await apiClient.get<CustomerPage>('/customers', {
      params: {
        page: params?.page ?? 1,
        limit: Math.min(params?.limit ?? 20, 100),
        ...(search ? { search } : {}),
      },
    });
    if (!r.data || !Array.isArray(r.data.data) || !r.data.meta) {
      throw new Error('Format respons daftar pelanggan tidak valid');
    }
    const { meta } = r.data;
    return {
      data: r.data.data.map(normalize),
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: Math.max(1, meta.totalPages),
    };
  },

  get: (id: string) =>
    apiClient.get<Customer>(`/customers/${id}`).then((r) => normalize(r.data)),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<Customer>('/customers', data).then((r) => r.data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.put<Customer>(`/customers/${id}`, data).then((r) => r.data),

  /** Soft delete: DELETE /customers/:id marks the customer inactive. */
  deactivate: (id: string) =>
    apiClient.delete<{ message: string }>(`/customers/${id}`).then((r) => r.data),

  // Segments are built-in and computed by the backend (no custom segment CRUD).
  listSegments: () =>
    apiClient.get<CustomerSegmentsResponse>('/customers/segments').then((r) => r.data),

  /** GET /customers/segments/:segment?page&limit(<=500, default 100) → array. */
  getSegmentCustomers: (segment: SegmentCode, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<SegmentCustomer[]>(`/customers/segments/${segment}`, { params })
      .then((r) => r.data),
};
