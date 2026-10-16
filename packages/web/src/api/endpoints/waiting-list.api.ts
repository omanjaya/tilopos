import { apiClient } from '../client';
import type {
  WaitingListEntry,
  WaitingListStats,
  WaitingListStatus,
  AddWaitingListRequest,
  SeatCustomerRequest,
} from '@/types/waiting-list.types';

/** Raw row returned by the backend waiting-list service. */
interface WaitingListRow {
  id: string;
  outletId: string;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  status: WaitingListStatus;
  notes: string | null;
  tableId: string | null;
  table?: { id?: string; name: string } | null;
  queuedAt: string;
  notifiedAt: string | null;
  seatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toEntry(row: WaitingListRow): WaitingListEntry {
  return {
    id: row.id,
    outletId: row.outletId,
    customerName: row.customerName,
    phoneNumber: row.customerPhone ?? null,
    partySize: row.partySize,
    status: row.status,
    specialRequests: row.notes ?? null,
    tableId: row.tableId ?? null,
    tableName: row.table?.name ?? null,
    queuedAt: row.queuedAt,
    notifiedAt: row.notifiedAt ?? null,
    seatedAt: row.seatedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * All list/stats calls require an outletId: the backend scopes the waiting list
 * per outlet, so callers must disable their queries until an outlet is chosen.
 */
export const waitingListApi = {
  list: (outletId: string, params?: { status?: WaitingListStatus }) =>
    apiClient
      .get<WaitingListRow[]>('/waiting-list', { params: { outletId, ...params } })
      .then((r) => r.data.map(toEntry)),

  create: (data: AddWaitingListRequest) =>
    apiClient.post<WaitingListRow>('/waiting-list', data).then((r) => toEntry(r.data)),

  notify: (id: string) =>
    apiClient.put<WaitingListRow>(`/waiting-list/${id}/notify`).then((r) => r.data),

  seat: (id: string, data: SeatCustomerRequest) =>
    apiClient.put<WaitingListRow>(`/waiting-list/${id}/seat`, data).then((r) => toEntry(r.data)),

  cancel: (id: string) =>
    apiClient.put<WaitingListRow>(`/waiting-list/${id}/cancel`).then((r) => r.data),

  noShow: (id: string) =>
    apiClient.put<WaitingListRow>(`/waiting-list/${id}/no-show`).then((r) => r.data),

  stats: (outletId: string) =>
    apiClient
      .get<WaitingListStats>('/waiting-list/stats', { params: { outletId } })
      .then((r) => r.data),
};
