import { apiClient } from '../client';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerSegment,
  CreateSegmentRequest,
} from '@/types/customer.types';

export const customersApi = {
  list: (params?: { search?: string }) =>
    apiClient.get<Customer[]>('/customers', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Customer>(`/customers/${id}`).then((r) => r.data),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<Customer>('/customers', data).then((r) => r.data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.put<Customer>(`/customers/${id}`, data).then((r) => r.data),

  // Segments
  listSegments: () =>
    apiClient.get('/customers/segments').then((r) => {
      const raw = r.data as Record<string, unknown>;
      // API returns { totalCustomers, segments: [...] } wrapper
      const segments = (Array.isArray(raw) ? raw : Array.isArray(raw.segments) ? raw.segments : []) as Array<Record<string, unknown>>;
      return segments.map((s) => ({
        id: (s.id as string) ?? (s.segment as string) ?? '',
        name: (s.name as string) ?? (s.label as string) ?? '',
        type: (s.type as string) ?? (s.segment as string) ?? 'custom',
        description: (s.description as string) ?? null,
        criteria: (s.criteria as CustomerSegment['criteria']) ?? null,
        customerCount: (s.customerCount as number) ?? (s.count as number) ?? 0,
        createdAt: (s.createdAt as string) ?? new Date().toISOString(),
      })) as CustomerSegment[];
    }),
  getSegment: (id: string) =>
    apiClient.get<CustomerSegment>(`/customers/segments/${id}`).then((r) => r.data),
  getSegmentCustomers: (id: string) =>
    apiClient.get<Customer[]>(`/customers/segments/${id}/customers`).then((r) => r.data),
  createSegment: (data: CreateSegmentRequest) =>
    apiClient.post<CustomerSegment>('/customers/segments', data).then((r) => r.data),
  deleteSegment: (id: string) =>
    apiClient.delete(`/customers/segments/${id}`).then((r) => r.data),
};
