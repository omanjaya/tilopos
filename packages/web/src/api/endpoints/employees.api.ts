import { apiClient } from '../client';
import type { PaginationParams } from '@/types/api.types';
import type { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types/employee.types';
import type { EmployeeRole } from '@/types/auth.types';

export const employeesApi = {
  list: (params?: PaginationParams & { role?: EmployeeRole; isActive?: boolean }) =>
    apiClient.get<Employee[]>('/employees', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Employee>(`/employees/${id}`).then((r) => r.data),

  create: (data: CreateEmployeeRequest) =>
    apiClient.post<Employee>('/employees', data).then((r) => r.data),

  update: (id: string, data: UpdateEmployeeRequest) =>
    apiClient.put<Employee>(`/employees/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/employees/${id}`).then((r) => r.data),
};
