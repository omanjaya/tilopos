import { apiClient } from '../client';
import type {
  StockLevel,
  StockAdjustmentRequest,
  StockTransfer,
  CreateTransferRequest,
  Supplier,
  CreateSupplierRequest,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
} from '@/types/inventory.types';

export const inventoryApi = {
  // Stock Levels
  getStockLevels: (outletId: string) =>
    apiClient.get(`/inventory/stock/${outletId}`).then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend may return raw Prisma data with product relation instead of flat fields
      return arr.map((s) => {
        const product = s.product as Record<string, unknown> | undefined;
        return {
          ...s,
          productName: (s.productName ?? product?.name ?? 'Unknown') as string,
          sku: (s.sku ?? product?.sku ?? '-') as string,
          currentStock: Number(s.currentStock ?? s.quantity ?? 0),
          minStock: Number(s.minStock ?? s.minStockLevel ?? 0),
        };
      }) as StockLevel[];
    }),

  getLowStock: (outletId: string) =>
    apiClient.get<StockLevel[]>(`/inventory/stock/${outletId}/low`).then((r) => {
      const raw = r.data;
      return Array.isArray(raw) ? raw : [];
    }),

  adjustStock: (data: StockAdjustmentRequest) =>
    apiClient.post('/inventory/stock/adjust', {
      outletId: data.outletId,
      productId: data.productId,
      adjustmentType: data.type,
      quantity: data.quantity,
      reason: data.reason,
    }).then((r) => r.data),

  // Stock Transfers
  listTransfers: (params?: { status?: string }) =>
    apiClient.get('/stock-transfers', { params }).then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend includes sourceOutlet and destinationOutlet as objects
      return arr.map((t) => {
        const source = t.sourceOutlet as Record<string, unknown> | undefined;
        const dest = t.destinationOutlet as Record<string, unknown> | undefined;
        return {
          ...t,
          transferNumber: (t.transferNumber ?? t.id ?? '') as string,
          sourceOutletName: (t.sourceOutletName ?? source?.name ?? '-') as string,
          destinationOutletName: (t.destinationOutletName ?? dest?.name ?? '-') as string,
          status: (t.status ?? 'requested') as string,
          items: Array.isArray(t.items) ? t.items : [],
        };
      }) as StockTransfer[];
    }),

  getTransfer: (id: string) =>
    apiClient.get<StockTransfer>(`/stock-transfers/${id}`).then((r) => r.data),

  createTransfer: (data: CreateTransferRequest) =>
    apiClient.post<StockTransfer>('/stock-transfers', data).then((r) => r.data),

  approveTransfer: (id: string) =>
    apiClient.put(`/stock-transfers/${id}/approve`).then((r) => r.data),

  shipTransfer: (id: string) =>
    apiClient.put(`/stock-transfers/${id}/ship`).then((r) => r.data),

  receiveTransfer: (id: string, items: { stockTransferItemId: string; receivedQuantity: number }[]) =>
    apiClient.put(`/stock-transfers/${id}/receive`, { items }).then((r) => r.data),

  // Transfer Templates
  listTransferTemplates: () =>
    apiClient.get('/transfer-templates').then((r) => r.data),

  getTransferTemplate: (id: string) =>
    apiClient.get(`/transfer-templates/${id}`).then((r) => r.data),

  createTransferTemplate: (data: any) =>
    apiClient.post('/transfer-templates', data).then((r) => r.data),

  updateTransferTemplate: (id: string, data: any) =>
    apiClient.put(`/transfer-templates/${id}`, data).then((r) => r.data),

  deleteTransferTemplate: (id: string) =>
    apiClient.delete(`/transfer-templates/${id}`).then((r) => r.data),

  // Suppliers
  listSuppliers: (params?: { search?: string }) =>
    apiClient.get('/suppliers', { params }).then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend uses contactPerson, frontend expects contactName
      return arr.map((s) => ({
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
  listPurchaseOrders: (params?: { status?: string }) =>
    apiClient.get('/suppliers/purchase-orders', { params }).then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      return arr.map((po) => ({
        ...po,
        supplierName: (po.supplierName ?? '') as string,
        outletName: (po.outletName ?? '') as string,
        totalAmount: Number(po.totalAmount ?? 0),
        items: Array.isArray(po.items) ? po.items : [],
      })) as PurchaseOrder[];
    }),

  getPurchaseOrder: (id: string) =>
    apiClient.get<PurchaseOrder>(`/suppliers/purchase-orders/${id}`).then((r) => r.data),

  createPurchaseOrder: (data: CreatePurchaseOrderRequest) =>
    apiClient.post<PurchaseOrder>('/suppliers/purchase-orders', data).then((r) => r.data),

  receivePurchaseOrder: (id: string) =>
    apiClient.put(`/suppliers/purchase-orders/${id}/receive`).then((r) => r.data),

  // Outlet Product Assignment
  getOutletProducts: (outletId: string) =>
    apiClient.get(`/inventory/outlets/${outletId}/products`).then((r) => r.data),

  getUnassignedProducts: (outletId: string) =>
    apiClient.get(`/inventory/outlets/${outletId}/products/unassigned`).then((r) => r.data),

  assignProducts: (outletId: string, productIds: string[]) =>
    apiClient.post(`/inventory/outlets/${outletId}/products/assign`, { productIds }).then((r) => r.data),

  removeProductFromOutlet: (outletId: string, productId: string) =>
    apiClient.delete(`/inventory/outlets/${outletId}/products/${productId}`).then((r) => r.data),
};
