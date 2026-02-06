import { apiClient } from '../client';
import type {
    CreateTransactionRequest,
    CreateTransactionResponse,
    Transaction,
    HeldBill,
    ReceiptData,
    CashDrawerEntry,
    POSProduct,
    POSCategory,
} from '@/types/pos.types';
import type { Product, Category } from '@/types/product.types';

interface HoldBillRequest {
    outletId: string;
    tableId?: string;
    customerName?: string;
    items: {
        productId: string;
        variantId?: string;
        quantity: number;
        modifierIds?: string[];
        notes?: string;
    }[];
    notes?: string;
}

export const posApi = {
    // Products for POS display
    getProducts: async (_outletId: string): Promise<POSProduct[]> => {
        const { data } = await apiClient.get<Product[]>('/inventory/products');
        // Transform to POSProduct format - only return active products
        return data
            .filter((product) => product.isActive)
            .map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                basePrice: product.basePrice,
                imageUrl: product.imageUrl ?? undefined,
                categoryId: product.categoryId ?? undefined,
                categoryName: product.category?.name ?? undefined,
                variants: (product.variants || []).map((v) => ({
                    id: v.id,
                    name: v.name,
                    price: v.price,
                })),
                modifierGroups: [], // Will be fetched separately if needed
                trackStock: product.trackStock,
            }));
    },

    getCategories: async (_outletId: string): Promise<POSCategory[]> => {
        const { data } = await apiClient.get<Category[]>('/inventory/categories');
        // Only return active categories
        return data
            .filter((cat) => cat.isActive)
            .map((cat) => ({
            id: cat.id,
            name: cat.name,
            productCount: cat.productCount ?? 0,
        }));
    },

    // Transaction operations
    createTransaction: async (request: CreateTransactionRequest): Promise<CreateTransactionResponse> => {
        const { data } = await apiClient.post<CreateTransactionResponse>('/pos/transactions', request);
        return data;
    },

    getTransaction: async (id: string): Promise<Transaction> => {
        const { data } = await apiClient.get<Transaction>(`/pos/transactions/${id}`);
        return data;
    },

    reprintReceipt: async (id: string): Promise<ReceiptData> => {
        const { data } = await apiClient.get<ReceiptData>(`/pos/transactions/${id}/reprint`);
        return data;
    },

    // Hold/Resume Bill
    holdBill: async (request: HoldBillRequest): Promise<HeldBill> => {
        const { data } = await apiClient.post<HeldBill>('/pos/hold', request);
        return data;
    },

    getHeldBills: async (outletId: string): Promise<HeldBill[]> => {
        const { data } = await apiClient.get<HeldBill[]>('/pos/held-bills', {
            params: { outletId },
        });
        return data;
    },

    resumeBill: async (billId: string): Promise<HeldBill> => {
        const { data } = await apiClient.post<HeldBill>(`/pos/resume/${billId}`);
        return data;
    },

    // Cash Drawer
    cashIn: async (shiftId: string, entry: CashDrawerEntry): Promise<void> => {
        await apiClient.post('/pos/cash-in', {
            shiftId,
            amount: entry.amount,
            notes: entry.notes,
        });
    },

    cashOut: async (shiftId: string, entry: CashDrawerEntry): Promise<void> => {
        await apiClient.post('/pos/cash-out', {
            shiftId,
            amount: entry.amount,
            reason: entry.reason,
            notes: entry.notes,
        });
    },

    // Void & Refund
    voidTransaction: async (transactionId: string, reason: string): Promise<void> => {
        await apiClient.post('/pos/void', { transactionId, reason });
    },

    processRefund: async (
        transactionId: string,
        items: { itemId: string; quantity: number }[],
        refundMethod: string,
        notes?: string,
    ): Promise<void> => {
        await apiClient.post('/pos/refunds', {
            transactionId,
            items,
            refundMethod,
            notes,
        });
    },
};
