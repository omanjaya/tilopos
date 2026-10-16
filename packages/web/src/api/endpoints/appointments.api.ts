import { apiClient } from '../client';

/**
 * Shapes mirror packages/backend/src/modules/appointments (service returns bare
 * Prisma rows — no `{ appointment }` / `{ appointments }` wrapper).
 * Decimal columns serialize as strings.
 */
export interface Appointment {
  id: string;
  businessId: string;
  outletId: string;
  customerId: string | null;
  employeeId: string | null;
  serviceName: string;
  servicePrice: number | string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  customer?: { name: string; phone: string | null } | null;
  employee?: { name: string } | null;
}

export interface CreateAppointmentRequest {
  outletId: string;
  customerId?: string;
  employeeId?: string;
  serviceName: string;
  servicePrice: number;
  startTime: string;
  durationMinutes: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
}

export const appointmentsApi = {
  /** `date` is the local business date as YYYY-MM-DD. */
  listByDate: (outletId: string, date: string) =>
    apiClient
      .get<Appointment[]>(`/appointments/outlet/${outletId}`, { params: { date } })
      .then((r) => r.data),

  create: (data: CreateAppointmentRequest) =>
    apiClient.post<Appointment>('/appointments', data).then((r) => r.data),

  updateStatus: (id: string, status: Appointment['status']) =>
    apiClient.put<Appointment>(`/appointments/${id}/status`, { status }).then((r) => r.data),

  cancel: (id: string, reason?: string) =>
    apiClient.put<Appointment>(`/appointments/${id}/cancel`, { reason }).then((r) => r.data),
};
