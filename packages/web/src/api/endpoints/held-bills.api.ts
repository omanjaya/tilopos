import { apiClient } from '../client';
import type { OrderType, TransactionItemRequest } from '@/types/pos.types';

/** HoldBillDto; business and employee are taken from the server's authenticated user. */
export interface HoldBillRequest {
  outletId: string;
  clientBillId: string;
  tableId?: string;
  customerId?: string;
  customerName?: string;
  orderType?: OrderType;
  discountAmount?: number;
  discountPercent?: number;
  items: TransactionItemRequest[];
  notes?: string;
}
/** HeldBillData from the backend. Older saved records may lack optional snapshot fields. */
export interface ServerHeldBill {
  id: string;
  businessId: string;
  outletId: string;
  employeeId: string;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  orderType?: OrderType;
  discountAmount?: number;
  discountPercent?: number;
  discountTotal?: number;
  items: {
    productId?: string;
    bundleId?: string;
    variantId?: string;
    quantity: number;
    notes?: string;
    unitPrice?: number;
    originalPrice?: number;
    productName?: string;
    variantName?: string;
    modifierIds?: string[];
    modifiers?: { id: string; name: string; price: number }[];
  }[];
  notes?: string;
  subtotal?: number;
  heldAt: string;
  requestHash?: string;
}
export const heldBillsApi = {
  hold: (body: HoldBillRequest) =>
    apiClient
      .post<{ billId: string }>('/pos/hold', body, { skipGlobalErrorHandler: true })
      .then((r) => r.data),
  list: (outletId: string, cursor = '0') =>
    apiClient
      .get<{
        bills: ServerHeldBill[];
        cursor: string;
      }>('/pos/held-bills', { params: { outletId, cursor }, skipGlobalErrorHandler: true })
      .then((r) => r.data),
  resume: (outletId: string, billId: string, requestId: string) =>
    apiClient
      .post<ServerHeldBill>(
        `/pos/resume/${billId}`,
        { requestId },
        { params: { outletId }, skipGlobalErrorHandler: true },
      )
      .then((r) => r.data),
  discard: (outletId: string, billId: string) =>
    apiClient
      .delete<{
        success: true;
      }>(`/pos/held-bills/${billId}`, { params: { outletId }, skipGlobalErrorHandler: true })
      .then((r) => r.data),
};
