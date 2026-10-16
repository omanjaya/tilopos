import { apiClient } from '../client';
import type {
  StockLevel,
  StockAdjustmentRequest,
  Supplier,
  CreateSupplierRequest,
} from '@/types/inventory.types';
import type { Product } from '@/types/product.types';
import type {
  TransferTemplate,
  CreateTransferTemplateRequest as TransferTemplatePayload,
} from '@/types/transfer-template.types';

type RawRecord = Record<string, unknown>;

/** List endpoints here return plain arrays; anything else is contract drift — surface it (F2). */
function asArray(data: unknown, endpoint: string): RawRecord[] {
  if (!Array.isArray(data)) {
    throw new Error(`Respons tidak valid dari ${endpoint}`);
  }
  return data as RawRecord[];
}

// ---------------------------------------------------------------------------
// Stock transfers — mirrors backend StockTransferStatus enum and the Prisma
// StockTransfer/StockTransferItem rows returned by /stock-transfers.
// ---------------------------------------------------------------------------

export type StockTransferStatus =
  | 'pending'
  | 'approved'
  | 'in_transit'
  | 'received'
  | 'rejected'
  | 'cancelled';

export const STOCK_TRANSFER_STATUSES: readonly StockTransferStatus[] = [
  'pending',
  'approved',
  'in_transit',
  'received',
  'rejected',
  'cancelled',
];

export interface StockTransferItemView {
  id: string;
  productId: string | null;
  variantId: string | null;
  itemName: string;
  quantitySent: number;
  quantityReceived: number | null;
}

export interface StockTransferView {
  id: string;
  transferNumber: string;
  sourceOutletId: string;
  sourceOutletName: string;
  destinationOutletId: string;
  destinationOutletName: string;
  status: StockTransferStatus;
  notes: string | null;
  requestedBy: string | null;
  /** Employee display names — null until the backend includes the employee relations. */
  requestedByName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  receivedBy: string | null;
  receivedByName: string | null;
  approvedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  items: StockTransferItemView[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferPayload {
  sourceOutletId: string;
  destinationOutletId: string;
  items: { productId?: string; variantId?: string; itemName: string; quantity: number }[];
  notes?: string;
  /** Transfer template the transfer was created from (increments its usageCount). */
  templateId?: string;
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function relName(v: unknown): string | null {
  return v && typeof v === 'object' ? str((v as RawRecord).name) : null;
}

function toStatus(v: unknown): StockTransferStatus {
  return STOCK_TRANSFER_STATUSES.includes(v as StockTransferStatus)
    ? (v as StockTransferStatus)
    : 'pending';
}

/** Prisma Decimal columns arrive as strings — convert once here. */
function mapTransfer(t: RawRecord): StockTransferView {
  const items = Array.isArray(t.items) ? (t.items as RawRecord[]) : [];
  return {
    id: String(t.id ?? ''),
    transferNumber: str(t.transferNumber) ?? String(t.id ?? ''),
    sourceOutletId: String(t.sourceOutletId ?? ''),
    sourceOutletName: relName(t.sourceOutlet) ?? '-',
    destinationOutletId: String(t.destinationOutletId ?? ''),
    destinationOutletName: relName(t.destinationOutlet) ?? '-',
    status: toStatus(t.status),
    notes: str(t.notes),
    requestedBy: str(t.requestedBy),
    requestedByName: relName(t.requestedByEmployee),
    approvedBy: str(t.approvedBy),
    approvedByName: relName(t.approvedByEmployee),
    receivedBy: str(t.receivedBy),
    receivedByName: relName(t.receivedByEmployee),
    approvedAt: str(t.approvedAt),
    shippedAt: str(t.shippedAt),
    receivedAt: str(t.receivedAt),
    createdAt: str(t.createdAt) ?? str(t.requestedAt) ?? '',
    updatedAt: str(t.updatedAt) ?? '',
    items: items.map((i) => ({
      id: String(i.id ?? ''),
      productId: str(i.productId),
      variantId: str(i.variantId),
      itemName: str(i.itemName) ?? '-',
      quantitySent: Number(i.quantitySent ?? 0),
      quantityReceived: i.quantityReceived == null ? null : Number(i.quantityReceived),
    })),
  };
}

// ---------------------------------------------------------------------------
// Purchase orders — mirrors GET /suppliers/purchase-orders (Prisma row with
// supplier {id,name}, outlet {id,name} and items) and backend PurchaseOrderStatus enum.
// ---------------------------------------------------------------------------

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrderItemView {
  id: string;
  itemName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseOrderView {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  outletId: string;
  outletName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  items: PurchaseOrderItemView[];
  createdAt: string;
}

export interface CreatePurchaseOrderPayload {
  outletId: string;
  supplierId: string;
  notes?: string;
  items: { productId?: string; variantId?: string; itemName: string; quantityOrdered: number; unitCost: number }[];
}

/** Result of PUT /suppliers/purchase-orders/:id/receive (ReceivePurchaseOrderUseCase). */
export interface ReceivePurchaseOrderResult {
  purchaseOrderId: string;
  status: 'received' | 'partial';
  itemsReceived: number;
  costUpdates: unknown[];
}

function mapPurchaseOrder(po: RawRecord): PurchaseOrderView {
  const items = Array.isArray(po.items) ? (po.items as RawRecord[]) : [];
  return {
    id: String(po.id ?? ''),
    poNumber: str(po.poNumber) ?? '',
    supplierId: String(po.supplierId ?? ''),
    supplierName: relName(po.supplier) ?? '-',
    outletId: String(po.outletId ?? ''),
    outletName: relName(po.outlet) ?? '-',
    status: (str(po.status) ?? 'draft') as PurchaseOrderStatus,
    totalAmount: Number(po.totalAmount ?? 0),
    notes: str(po.notes),
    orderedAt: str(po.orderedAt),
    receivedAt: str(po.receivedAt),
    createdAt: str(po.createdAt) ?? '',
    items: items.map((i) => ({
      id: String(i.id ?? ''),
      itemName: str(i.itemName) ?? '-',
      quantityOrdered: Number(i.quantityOrdered ?? 0),
      quantityReceived: Number(i.quantityReceived ?? 0),
      unitCost: Number(i.unitCost ?? 0),
      subtotal: Number(i.subtotal ?? 0),
    })),
  };
}

/**
 * Stock level row as returned by GET /inventory/stock/:outletId (one row per
 * product or variant; backend includes product/variant {id,name,sku}).
 */
export type StockLevelRow = StockLevel & { variantId: string | null; variantName: string | null };

function mapStockLevel(s: RawRecord): StockLevelRow {
  const product = (s.product ?? null) as RawRecord | null;
  const variant = (s.variant ?? null) as RawRecord | null;
  return {
    id: String(s.id ?? ''),
    productId: String(s.productId ?? ''),
    outletId: String(s.outletId ?? ''),
    productName: str(product?.name) ?? '-',
    sku: str(variant?.sku) ?? str(product?.sku) ?? '-',
    variantId: str(s.variantId),
    variantName: str(variant?.name),
    currentStock: Number(s.quantity ?? 0),
    // Backend returns the per-level threshold as `lowStockAlert`
    minStock: Number(s.lowStockAlert ?? 0),
    maxStock: null,
    updatedAt: str(s.updatedAt) ?? '',
  };
}

/** Unassigned products come back as raw Prisma rows (Decimal strings) — normalise prices. */
function mapProductRow(p: RawRecord): Product {
  return {
    ...(p as unknown as Product),
    basePrice: Number(p.basePrice ?? 0),
    costPrice: p.costPrice == null ? null : Number(p.costPrice),
  };
}

export const inventoryApi = {
  // Stock Levels
  /** GET /inventory/stock/:outletId without page/limit → plain array (server cap). */
  getStockLevels: (outletId: string): Promise<StockLevelRow[]> =>
    apiClient
      .get<unknown>(`/inventory/stock/${outletId}`)
      .then((r) => asArray(r.data, '/inventory/stock').map(mapStockLevel)),

  adjustStock: (data: StockAdjustmentRequest & { variantId?: string | null }) => {
    const typeMap: Record<StockAdjustmentRequest['type'], 'set' | 'increment' | 'decrement'> = {
      add: 'increment',
      remove: 'decrement',
      set: 'set',
    };
    return apiClient.post('/inventory/stock/adjust', {
      outletId: data.outletId,
      productId: data.productId,
      ...(data.variantId ? { variantId: data.variantId } : {}),
      adjustmentType: typeMap[data.type],
      quantity: data.quantity,
      reason: data.reason,
      ...(data.unitCost != null && { unitCost: data.unitCost }),
    }).then((r) => r.data);
  },

  // Stock Transfers
  /** GET /stock-transfers — plain array, newest first, at most 100 rows. */
  listTransfers: (params?: { status?: StockTransferStatus }) =>
    apiClient
      .get<unknown>('/stock-transfers', { params })
      .then((r) => asArray(r.data, '/stock-transfers').map(mapTransfer)),

  getTransfer: (id: string) =>
    apiClient.get<unknown>(`/stock-transfers/${id}`).then((r) => mapTransfer(r.data as RawRecord)),

  /** POST /stock-transfers — backend expects items[].itemName + quantity (productId optional). */
  createTransfer: (data: CreateTransferPayload) =>
    apiClient.post<unknown>('/stock-transfers', data).then((r) => r.data),

  directTransfer: (data: CreateTransferPayload) =>
    apiClient.post<{ transferId: string; transferNumber: string; status: string; itemCount: number }>(
      '/stock-transfers/direct',
      data,
    ).then((r) => r.data),

  approveTransfer: (id: string) =>
    apiClient.put(`/stock-transfers/${id}/approve`).then((r) => r.data),

  shipTransfer: (id: string) =>
    apiClient.put(`/stock-transfers/${id}/ship`).then((r) => r.data),

  /**
   * PUT /stock-transfers/:id/receive — optional per-item quantityReceived
   * (0..quantitySent); omitted items are received in full. 409 when the
   * transfer is no longer in transit or source stock is insufficient.
   */
  receiveTransfer: (id: string, items?: { stockTransferItemId: string; quantityReceived: number }[]) =>
    apiClient
      .put(`/stock-transfers/${id}/receive`, items && items.length > 0 ? { items } : {})
      .then((r) => r.data),

  // Transfer Templates
  listTransferTemplates: () =>
    apiClient
      .get<unknown>('/transfer-templates')
      .then((r) => asArray(r.data, '/transfer-templates') as unknown as TransferTemplate[]),

  createTransferTemplate: (data: TransferTemplatePayload) =>
    apiClient.post('/transfer-templates', data).then((r) => r.data),

  updateTransferTemplate: (id: string, data: TransferTemplatePayload) =>
    apiClient.put(`/transfer-templates/${id}`, data).then((r) => r.data),

  deleteTransferTemplate: (id: string) =>
    apiClient.delete(`/transfer-templates/${id}`).then((r) => r.data),

  // Suppliers
  /** GET /suppliers — active suppliers, plain array (max 100 per page); filter client-side. */
  listSuppliers: () =>
    apiClient.get<unknown>('/suppliers').then((r) => {
      // Backend uses contactPerson, frontend expects contactName
      return asArray(r.data, '/suppliers').map((s) => ({
        ...s,
        contactName: (s.contactName ?? s.contactPerson ?? null) as string | null,
      })) as Supplier[];
    }),

  createSupplier: (data: CreateSupplierRequest) =>
    apiClient.post<Supplier>('/suppliers', {
      name: data.name,
      contactPerson: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
    }).then((r) => r.data),

  updateSupplier: (id: string, data: Partial<CreateSupplierRequest>) =>
    apiClient.put<Supplier>(`/suppliers/${id}`, {
      name: data.name,
      contactPerson: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
    }).then((r) => r.data),

  deleteSupplier: (id: string) =>
    apiClient.delete(`/suppliers/${id}`).then((r) => r.data),

  // Purchase Orders
  listPurchaseOrders: (params?: { status?: PurchaseOrderStatus }) =>
    apiClient
      .get<unknown>('/suppliers/purchase-orders', { params })
      .then((r) => asArray(r.data, '/suppliers/purchase-orders').map(mapPurchaseOrder)),

  createPurchaseOrder: (data: CreatePurchaseOrderPayload) =>
    apiClient.post('/suppliers/purchase-orders', data).then((r) => r.data),

  /** Approver is the JWT user; body only carries optional notes. draft → ordered. */
  approvePurchaseOrder: (id: string, notes?: string) =>
    apiClient
      .put(`/suppliers/purchase-orders/${id}/approve`, notes ? { notes } : {})
      .then((r) => r.data),

  /**
   * Receives an ordered/partial PO. Without items every line is received in full
   * (remaining quantity); 409 when already received.
   */
  receivePurchaseOrder: (
    id: string,
    items?: { purchaseOrderItemId: string; quantityReceived: number }[],
  ) =>
    apiClient
      .put<ReceivePurchaseOrderResult>(
        `/suppliers/purchase-orders/${id}/receive`,
        items && items.length > 0 ? { items } : {},
      )
      .then((r) => r.data),

  // Outlet Product Assignment
  /** GET /inventory/outlets/:id/products without page/limit → plain array (Decimals as numbers). */
  getOutletProducts: (outletId: string): Promise<Product[]> =>
    apiClient
      .get<unknown>(`/inventory/outlets/${outletId}/products`)
      .then((r) => asArray(r.data, '/inventory/outlets/:id/products') as unknown as Product[]),

  getUnassignedProducts: (outletId: string): Promise<Product[]> =>
    apiClient
      .get<unknown>(`/inventory/outlets/${outletId}/products/unassigned`)
      .then((r) => asArray(r.data, '/inventory/outlets/:id/products/unassigned').map(mapProductRow)),

  /** skipped = ids that do not belong to the business. */
  assignProducts: (outletId: string, productIds: string[]) =>
    apiClient
      .post<{ assigned: number; skipped: number }>(`/inventory/outlets/${outletId}/products/assign`, {
        productIds,
      })
      .then((r) => r.data),

  /** DELETE /inventory/outlets/:id/products (bulk). */
  removeProductsFromOutlet: (outletId: string, productIds: string[]) =>
    apiClient
      .delete<{ removed: number }>(`/inventory/outlets/${outletId}/products`, { data: { productIds } })
      .then((r) => r.data),
};
