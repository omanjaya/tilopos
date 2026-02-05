import { apiClient } from '../client';
import type { PaginationParams } from '@/types/api.types';
import type {
  WaitingListEntry,
  WaitingListStats,
  AddWaitingListRequest,
  UpdateWaitingListRequest,
  SeatCustomerRequest,
} from '@/types/waiting-list.types';

export const waitingListApi = {
  // Standard CRUD operations
  list: (params?: PaginationParams & { status?: string; outletId?: string }) =>
    apiClient.get<WaitingListEntry[]>('/waiting-list', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<WaitingListEntry>(`/waiting-list/${id}`).then((r) => r.data),

  create: (data: AddWaitingListRequest) =>
    apiClient.post<WaitingListEntry>('/waiting-list', data).then((r) => r.data),

  update: (id: string, data: UpdateWaitingListRequest) =>
    apiClient.put<WaitingListEntry>(`/waiting-list/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/waiting-list/${id}`).then((r) => r.data),

  // Custom actions
  notify: (id: string) =>
    apiClient.put<WaitingListEntry>(`/waiting-list/${id}/notify`).then((r) => r.data),

  seat: (id: string, data: SeatCustomerRequest) =>
    apiClient.put<WaitingListEntry>(`/waiting-list/${id}/seat`, data).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.put<WaitingListEntry>(`/waiting-list/${id}/cancel`).then((r) => r.data),

  noShow: (id: string) =>
    apiClient.put<WaitingListEntry>(`/waiting-list/${id}/no-show`).then((r) => r.data),

  // Stats
  stats: (outletId?: string) =>
    apiClient.get<WaitingListStats>('/waiting-list/stats', {
      params: outletId ? { outletId } : undefined,
    }).then((r) => r.data),
};
