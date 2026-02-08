import { apiClient } from '../client';

export interface Appointment {
  id: string;
  businessId: string;
  outletId: string;
  customerId: string | null;
  employeeId: string | null;
  serviceName: string;
  servicePrice: number;
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

export const appointmentsApi = {
  listByDate: (outletId: string, date: string) =>
    apiClient.get<{ appointments: Appointment[] }>(`/appointments/outlet/${outletId}`, { params: { date } }).then((r) => r.data.appointments),

  listByEmployee: (employeeId: string, startDate: string, endDate: string) =>
    apiClient.get<{ appointments: Appointment[] }>(`/appointments/employee/${employeeId}`, { params: { startDate, endDate } }).then((r) => r.data.appointments),

  listByCustomer: (customerId: string) =>
    apiClient.get<{ appointments: Appointment[] }>(`/appointments/customer/${customerId}`).then((r) => r.data.appointments),

  getUpcoming: (outletId: string) =>
    apiClient.get<{ appointments: Appointment[] }>(`/appointments/upcoming/${outletId}`).then((r) => r.data.appointments),

  checkAvailability: (params: { outletId: string; employeeId: string; startTime: string; durationMinutes: number }) =>
    apiClient.get<{ available: boolean; conflicts: Appointment[] }>('/appointments/availability', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<{ appointment: Appointment }>(`/appointments/${id}`).then((r) => r.data.appointment),

  create: (data: {
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
  }) => apiClient.post<{ appointment: Appointment }>('/appointments', data).then((r) => r.data.appointment),

  update: (id: string, data: Partial<Appointment>) =>
    apiClient.put<{ appointment: Appointment }>(`/appointments/${id}`, data).then((r) => r.data.appointment),

  updateStatus: (id: string, status: string) =>
    apiClient.put<{ appointment: Appointment }>(`/appointments/${id}/status`, { status }).then((r) => r.data.appointment),

  cancel: (id: string, reason?: string) =>
    apiClient.put<{ appointment: Appointment }>(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.appointment),
};
