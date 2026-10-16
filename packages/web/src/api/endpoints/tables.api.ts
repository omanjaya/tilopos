import { apiClient } from '../client';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface TableApiResponse {
  id: string;
  outletId: string;
  name: string;
  capacity: number;
  section: string | null;
  positionX: number | null;
  positionY: number | null;
    status: TableStatus;
  currentOrderId: string | null;
  occupiedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Backend Prisma PaymentMethod enum (split/merge bill payment methods). */
export type BillPaymentMethod =
  | 'cash'
  | 'card'
  | 'debit_card'
  | 'credit_card'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'linkaja'
  | 'qris'
  | 'bank_transfer';

/**
 * POST /tables/split-bill body (backend SplitBillDto): 2..20 parts.
 * by_amount: every amount > 0 and the sum must equal the bill's grandTotal exactly.
 * by_item: every bill item (TransactionItem id) assigned to exactly one part.
 * 409 when the bill was already split/merged.
 */
export interface SplitBillRequest {
  transactionId: string;
  splitType: 'equal' | 'by_item' | 'by_amount';
  splits: {
    customerName?: string;
    itemIds?: string[];
    amount?: number;
    paymentMethod: BillPaymentMethod;
  }[];
}

export interface SplitBillResponse {
  parentTransactionId: string;
  childTransactions: unknown[];
}

/** POST /tables/merge-bill body (backend MergeBillDto): 2..20 transactions of one outlet. */
export interface MergeBillRequest {
  transactionIds: string[];
  /** Optional; only recorded in the merged bill's notes (original payments are moved). */
  paymentMethod?: BillPaymentMethod;
}

export interface MergeBillResponse {
  mergedTransactionId: string;
  receiptNumber: string;
  outletId: string;
  grandTotal: number;
}

export interface CreateTableRequest {
  outletId: string;
  name: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
}

/** PUT /tables/:id (SUPERVISOR+). Status changes go through PUT /tables/:id/status. */
export interface UpdateTableRequest {
  name?: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
  isActive?: boolean;
}

export const tablesApi = {
  /** GET /tables — without outletId, tables of every accessible outlet. */
  list: (params: {
    outletId?: string;
    section?: string;
    status?: TableStatus;
    activeOnly?: boolean;
  }): Promise<TableApiResponse[]> =>
    apiClient
      .get<TableApiResponse[]>('/tables', { params })
      .then((r) => r.data),

  create: (data: CreateTableRequest) =>
    apiClient.post<TableApiResponse>('/tables', data).then((r) => r.data),

  update: (id: string, data: UpdateTableRequest) =>
    apiClient.put<TableApiResponse>(`/tables/${id}`, data).then((r) => r.data),

  /** DELETE /tables/:id deactivates the table (MANAGER+). */
  remove: (id: string) =>
    apiClient.delete(`/tables/${id}`).then((r) => r.data),

  splitBill: (data: SplitBillRequest) =>
    apiClient.post<SplitBillResponse>('/tables/split-bill', data).then((r) => r.data),

  mergeBill: (data: MergeBillRequest) =>
    apiClient.post<MergeBillResponse>('/tables/merge-bill', data).then((r) => r.data),
};
