import { apiClient } from '../client';
import type { Shift } from '@/types/order.types';
import { toast } from '@/lib/toast-utils';

export const shiftsApi = {
  list: (_employeeId: string) =>
    // Backend has GET /employees/:id/shifts/report and GET /employees/shifts/current
    // There's no list-all-shifts endpoint. Attempt the report endpoint for shift history,
    // falling back to empty array on error.
    apiClient.get<Shift[]>(`/employees/${_employeeId}/shifts/report`, {
      params: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    }).then((r) => {
      const raw = r.data;
      // The report endpoint may return { shifts: [...] } or just an array
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).shifts)) {
        return (raw as Record<string, unknown>).shifts as Shift[];
      }
      return [];
    }).catch(() => {
      toast.error({ title: 'Failed to load shift history' });
      return [] as Shift[];
    }),

  start: (_employeeId: string, data: { outletId: string; openingCash: number }) =>
    // Backend endpoint: POST /employees/shifts/start (uses @CurrentUser)
    apiClient.post('/employees/shifts/start', data).then((r) => r.data),

  end: (_employeeId: string, data: { closingCash: number; notes?: string }) =>
    // Need active shiftId; get current shift first, then end it
    apiClient.get('/employees/shifts/current').then((r) => {
      const shift = r.data as Record<string, unknown>;
      const shiftId = shift?.id as string;
      if (!shiftId) {
        toast.error({ title: 'No active shift found' });
        throw new Error('No active shift found');
      }
      return apiClient.post(`/employees/shifts/${shiftId}/end`, data).then((r2) => r2.data);
    }).catch((error: Error) => {
      if (error.message !== 'No active shift found') {
        toast.error({ title: 'Failed to end shift' });
      }
      throw error;
    }),

  cashIn: (data: { shiftId: string; amount: number; notes?: string }) =>
    apiClient.post('/pos/cash-in', data).then((r) => r.data),

  cashOut: (data: { shiftId: string; amount: number; notes?: string }) =>
    apiClient.post('/pos/cash-out', data).then((r) => r.data),
};
