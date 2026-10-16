import { apiClient } from '../client';
import type { Shift } from '@/types/order.types';

/** Open shift record from GET /employees/shifts/current (null when none is open). */
export interface CurrentShift {
  id: string;
  outletId: string;
  employeeId: string;
  openingCash: number;
  startedAt: string;
}

export const shiftsApi = {
  /**
   * GET /employees/:id/shifts — Shift[] newest first; own id for any role, manager+
   * for others. Paged (?page, ?limit default 50, max 100); still a plain array.
   */
  list: (employeeId: string, params: { page?: number; limit?: number } = { limit: 100 }) =>
    apiClient.get<Shift[]>(`/employees/${employeeId}/shifts`, { params }).then((r) => r.data),

  /** GET /employees/shifts/current — the backend returns `{ shift: null }` when no shift is open. */
  current: () =>
    apiClient
      .get<CurrentShift | { shift: null }>('/employees/shifts/current')
      .then((r): CurrentShift | null => {
        const d = r.data;
        return d && 'id' in d && d.id ? d : null;
      }),

  /** POST /employees/shifts/start — the employee comes from the JWT; the id arg is kept for call-site compatibility. */
  start: (_employeeId: string, data: { outletId: string; openingCash: number }) =>
    apiClient.post('/employees/shifts/start', data).then((r) => r.data),

  /** POST /employees/shifts/:shiftId/end — ends the caller's own open shift. */
  end: (shiftId: string, data: { closingCash: number; notes?: string }) =>
    apiClient.post(`/employees/shifts/${shiftId}/end`, data).then((r) => r.data),

  cashIn: (data: { shiftId: string; amount: number; notes?: string }) =>
    apiClient.post('/pos/cash-in', data).then((r) => r.data),

  cashOut: (data: { shiftId: string; amount: number; reason: string; notes?: string }) =>
    apiClient.post('/pos/cash-out', data).then((r) => r.data),
};
