import { apiClient } from '../client';
import type {
  StockOpname,
  StockOpnameDetail,
  StockOpnameStatus,
  CreateStockOpnameRequest,
  UpdateOpnameItemRequest,
} from '@/types/stock-opname.types';

/** Item quantities are Prisma Decimals serialized as strings — convert once here. */
function mapDetail(d: StockOpnameDetail): StockOpnameDetail {
  return {
    ...d,
    items: (d.items ?? []).map((i) => ({
      ...i,
      systemQuantity: Number(i.systemQuantity ?? 0),
      actualQuantity: i.actualQuantity == null ? null : Number(i.actualQuantity),
      difference: i.difference == null ? null : Number(i.difference),
    })),
  };
}

/**
 * Status conflicts (complete twice, edit/cancel a closed opname) return 409.
 * list/create = owner, manager, inventory; detail/items also supervisor;
 * complete/cancel = owner, manager.
 */
export const stockOpnameApi = {
  /** Newest first, plain array of at most 100 rows. */
  list: (params?: { outletId?: string; status?: StockOpnameStatus }) =>
    apiClient.get<unknown>('/inventory/stock-opname', { params }).then((r) => {
      if (!Array.isArray(r.data)) throw new Error('Respons daftar stock opname tidak valid');
      return r.data as StockOpname[];
    }),

  getById: (id: string) =>
    apiClient.get<StockOpnameDetail>(`/inventory/stock-opname/${id}`).then((r) => mapDetail(r.data)),

  create: (data: CreateStockOpnameRequest) =>
    apiClient.post<StockOpnameDetail>('/inventory/stock-opname', data).then((r) => mapDetail(r.data)),

  updateItems: (id: string, items: UpdateOpnameItemRequest[]) =>
    apiClient
      .patch<StockOpnameDetail>(`/inventory/stock-opname/${id}/items`, { items })
      .then((r) => mapDetail(r.data)),

  complete: (id: string) =>
    apiClient
      .post<StockOpnameDetail>(`/inventory/stock-opname/${id}/complete`)
      .then((r) => mapDetail(r.data)),

  cancel: (id: string) =>
    apiClient.post(`/inventory/stock-opname/${id}/cancel`).then((r) => r.data),
};
