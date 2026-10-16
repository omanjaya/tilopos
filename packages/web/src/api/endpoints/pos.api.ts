import { apiClient } from '../client';
import type {
    CreateTransactionRequest,
    CreateTransactionResponse,
    PreviewTransactionRequest,
    PreviewTransactionResponse,
    ReceiptData,
    POSProduct,
    POSCategory,
    POSModifierGroup,
    PaymentMethod,
} from '@/types/pos.types';
import type { Product, Category } from '@/types/product.types';
import type { PaymentMethodType, ReceiptTemplate } from '@/types/settings.types';
import { toReceiptTemplate } from './settings.api';

/** GET /settings/pos/payment-methods — active methods, readable by every POS role. */
export interface POSPaymentMethodConfig {
    id: string;
    name: string;
    type: PaymentMethodType;
    processingFee: number;
    /** payments[].method value; 'card' = debit/credit card; null = not recordable by the POS. */
    method: PaymentMethod | null;
}

/** Raw shift record as returned by GET /employees/shifts/current (ShiftRecord). */
export interface ShiftRecord {
    id: string;
    outletId: string;
    employeeId: string;
    startedAt: string;
    openingCash: number;
    cashIn: number | null;
    cashOut: number | null;
    status: string;
}

/** Response of POST /employees/shifts/:id/end (EndShiftOutput). */
export interface EndShiftResult {
    shiftId: string;
    expectedCash: number;
    actualCash: number;
    difference: number;
    endedAt: string;
}

/** GET /employees/shifts/:shiftId/summary — live totals for the close-shift dialog. */
export interface ShiftLiveSummary {
    shiftId: string;
    status: string;
    openingCash: number;
    transactionCount: number;
    totalSales: number;
    cashSales: number;
    cashRefunds: number;
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    paymentBreakdown: { method: string; amount: number; count: number }[];
    paymentTotal: number;
}

/** Modifier group as attached to each row of GET /inventory/outlets/:id/products. */
interface ProductModifierGroupRow {
    id: string;
    name: string;
    selectionType: 'single' | 'multiple';
    isRequired: boolean;
    minSelection: number;
    maxSelection: number | null;
    modifiers: { id: string; name: string; price: number }[];
}

type CatalogRow = Product & { barcode?: string | null; modifierGroups?: ProductModifierGroupRow[] };

/**
 * Maps a backend modifier group to the POS shape. maxSelect 0 = unlimited. The explicit
 * maxSelection wins; without it a single-select group allows one choice.
 */
export function toPOSModifierGroup(g: ProductModifierGroupRow): POSModifierGroup {
    const maxSelect = g.maxSelection ?? (g.selectionType === 'single' ? 1 : 0);
    return {
        id: g.id,
        name: g.name,
        required: g.isRequired || g.minSelection > 0,
        minSelect: g.minSelection,
        maxSelect,
        modifiers: g.modifiers.map((m) => ({ id: m.id, name: m.name, price: Number(m.price) })),
    };
}

/** POS catalog item; barcode is carried so a scanner (text + Enter) can add the item. */
export type POSCatalogProduct = POSProduct & { barcode?: string };

export const posApi = {
    // Products for POS display
    getProducts: async (outletId: string): Promise<POSCatalogProduct[]> => {
        const { data } = await apiClient.get<CatalogRow[]>(
            `/inventory/outlets/${outletId}/products`,
        );
        // Transform to POSProduct format - only return active products
        return data
            .filter((product) => product.isActive)
            .map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode ?? undefined,
                basePrice: Number(product.basePrice),
                imageUrl: product.imageUrl ?? undefined,
                categoryId: product.categoryId ?? undefined,
                categoryName: product.category?.name ?? undefined,
                variants: (product.variants || []).map((v) => ({
                    id: v.id,
                    name: v.name,
                    price: Number(v.price),
                })),
                // Only groups that still have selectable modifiers are offered
                modifierGroups: (product.modifierGroups ?? [])
                    .filter((g) => g.modifiers.length > 0)
                    .map(toPOSModifierGroup),
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

    getPaymentMethods: async (): Promise<POSPaymentMethodConfig[]> => {
        const { data } = await apiClient.get<unknown>('/settings/pos/payment-methods');
        if (!Array.isArray(data)) throw new Error('Respons metode pembayaran tidak valid');
        return data as POSPaymentMethodConfig[];
    },

    /** GET /settings/pos/receipt — receipt template of the POS outlet (read-only). */
    getReceiptTemplate: async (outletId: string): Promise<ReceiptTemplate> => {
        const { data } = await apiClient.get<unknown>('/settings/pos/receipt', { params: { outletId } });
        return toReceiptTemplate(data);
    },

    // Transaction operations
    createTransaction: async (request: CreateTransactionRequest): Promise<CreateTransactionResponse> => {
        const { data } = await apiClient.post<CreateTransactionResponse>('/pos/transactions', request);
        return data;
    },

    /** POST /pos/transactions/preview — server-side totals of a cart (no side effects). */
    previewTransaction: async (request: PreviewTransactionRequest): Promise<PreviewTransactionResponse> => {
        const { data } = await apiClient.post<PreviewTransactionResponse>('/pos/transactions/preview', request);
        return data;
    },

    reprintReceipt: async (id: string): Promise<ReceiptData> => {
        const { data } = await apiClient.get<ReceiptData>(`/pos/transactions/${id}/reprint`);
        return data;
    },

    // Shift (POS-side view of the cashier's own open shift)
    getCurrentShiftRecord: async (): Promise<ShiftRecord | null> => {
        const { data } = await apiClient.get<ShiftRecord | { shift: null }>('/employees/shifts/current');
        if (!data || !('id' in data)) return null;
        return {
            ...data,
            openingCash: Number(data.openingCash ?? 0),
            cashIn: data.cashIn == null ? null : Number(data.cashIn),
            cashOut: data.cashOut == null ? null : Number(data.cashOut),
        };
    },

    getShiftSummary: async (shiftId: string): Promise<ShiftLiveSummary> => {
        const { data } = await apiClient.get<ShiftLiveSummary>(`/employees/shifts/${shiftId}/summary`);
        return data;
    },

    endShift: async (shiftId: string, body: { closingCash: number; notes?: string }): Promise<EndShiftResult> => {
        const { data } = await apiClient.post<EndShiftResult>(`/employees/shifts/${shiftId}/end`, body);
        return data;
    },

    // Cash Drawer (POST /pos/cash-in|cash-out on an open shift)
    cashIn: async (shiftId: string, entry: { amount: number; notes?: string }): Promise<void> => {
        await apiClient.post('/pos/cash-in', { shiftId, amount: entry.amount, notes: entry.notes });
    },

    /** CashOutDto.reason is required (max 255). */
    cashOut: async (shiftId: string, entry: { amount: number; reason: string; notes?: string }): Promise<void> => {
        await apiClient.post('/pos/cash-out', {
            shiftId,
            amount: entry.amount,
            reason: entry.reason,
            notes: entry.notes,
        });
    },
};
