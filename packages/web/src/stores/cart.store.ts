import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartModifier, OrderType, PaymentEntry, HeldBill } from '@/types/pos.types';
import { useUIStore } from './ui.store';

// Generate unique ID for cart items
const generateCartItemId = () => `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// 24 hours in milliseconds
const CART_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface CartState {
    // Cart items
    items: CartItem[];

    // Customer info
    customerId?: string;
    customerName?: string;

    // Table info (for dine-in)
    tableId?: string;
    tableName?: string;

    // Order type
    orderType: OrderType;

    // Notes
    notes?: string;

    // Discounts
    discountAmount: number;
    discountPercent: number;

    // Selected payment
    payments: PaymentEntry[];

    // Held bills
    heldBills: HeldBill[];

    // Timestamp of last cart modification (for hydration expiry check)
    lastUpdated: number;

    // Computed values
    subtotal: number;
    discountTotal: number;
    taxAmount: number;
    serviceCharge: number;
    total: number;
    totalPayments: number;
    changeDue: number;

    // Actions
    addItem: (item: Omit<CartItem, 'id'>) => void;
    updateItemQuantity: (itemId: string, quantity: number) => void;
    removeItem: (itemId: string) => void;
    updateItemNotes: (itemId: string, notes: string) => void;
    updateItemModifiers: (itemId: string, modifiers: CartModifier[]) => void;
    updateItemPrice: (itemId: string, price: number) => void;

    setCustomer: (customerId: string | undefined, customerName: string | undefined) => void;
    setTable: (tableId: string | undefined, tableName: string | undefined) => void;
    setOrderType: (orderType: OrderType) => void;
    setNotes: (notes: string) => void;

    setDiscountAmount: (amount: number) => void;
    setDiscountPercent: (percent: number) => void;

    addPayment: (payment: PaymentEntry) => void;
    removePayment: (index: number) => void;
    clearPayments: () => void;

    holdCurrentBill: (customerName?: string) => HeldBill;
    resumeBill: (bill: HeldBill) => void;
    removeHeldBill: (billId: string) => void;

    clearCart: () => void;
    recalculate: () => void;
}

const MAX_ITEM_QUANTITY = 99999.999;

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            orderType: 'dine_in',
            discountAmount: 0,
            discountPercent: 0,
            payments: [],
            heldBills: [],
            lastUpdated: Date.now(),
            subtotal: 0,
            discountTotal: 0,
            taxAmount: 0,
            serviceCharge: 0,
            total: 0,
            totalPayments: 0,
            changeDue: 0,

            addItem: (item) => {
                if (item.quantity > MAX_ITEM_QUANTITY) return;
                set((state) => {
                    // Check if same product/variant/bundle exists
                    const existingIndex = state.items.findIndex(
                        (i) =>
                            i.productId === item.productId &&
                            i.variantId === item.variantId &&
                            i.bundleId === item.bundleId &&
                            JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers),
                    );

                    const existingItem = existingIndex >= 0 ? state.items[existingIndex] : undefined;

                    if (existingItem) {
                        // Increase quantity on existing item
                        const newQuantity = Math.min(existingItem.quantity + item.quantity, MAX_ITEM_QUANTITY);
                        const newItems = [...state.items];
                        newItems[existingIndex] = {
                            ...existingItem,
                            quantity: newQuantity,
                        };
                        return { items: newItems, lastUpdated: Date.now() };
                    } else {
                        // Add new item with generated id
                        const newItem: CartItem = {
                            id: generateCartItemId(),
                            productId: item.productId,
                            variantId: item.variantId,
                            bundleId: item.bundleId,
                            name: item.name,
                            variantName: item.variantName,
                            price: item.price,
                            quantity: item.quantity,
                            modifiers: item.modifiers,
                            notes: item.notes,
                            imageUrl: item.imageUrl,
                        };
                        return { items: [...state.items, newItem], lastUpdated: Date.now() };
                    }
                });
                get().recalculate();
            },

            updateItemQuantity: (itemId, quantity) => {
                if (quantity > MAX_ITEM_QUANTITY) return;
                set((state) => ({
                    items: quantity <= 0
                        ? state.items.filter((i) => i.id !== itemId)
                        : state.items.map((i) =>
                            i.id === itemId ? { ...i, quantity } : i,
                        ),
                    lastUpdated: Date.now(),
                }));
                get().recalculate();
            },

            removeItem: (itemId) => {
                set((state) => ({
                    items: state.items.filter((i) => i.id !== itemId),
                    lastUpdated: Date.now(),
                }));
                get().recalculate();
            },

            updateItemNotes: (itemId, notes) => {
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === itemId ? { ...i, notes } : i,
                    ),
                    lastUpdated: Date.now(),
                }));
            },

            updateItemModifiers: (itemId, modifiers) => {
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === itemId ? { ...i, modifiers } : i,
                    ),
                    lastUpdated: Date.now(),
                }));
                get().recalculate();
            },

            updateItemPrice: (itemId, price) => {
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === itemId
                            ? { ...i, originalPrice: i.originalPrice ?? i.price, price }
                            : i,
                    ),
                    lastUpdated: Date.now(),
                }));
                get().recalculate();
            },

            setCustomer: (customerId, customerName) => {
                set({ customerId, customerName });
            },

            setTable: (tableId, tableName) => {
                set({ tableId, tableName });
            },

            setOrderType: (orderType) => {
                set({ orderType });
                get().recalculate();
            },

            setNotes: (notes) => {
                set({ notes });
            },

            setDiscountAmount: (amount) => {
                const subtotal = get().subtotal;
                set({ discountAmount: Math.min(Math.max(0, amount), subtotal), discountPercent: 0 });
                get().recalculate();
            },

            setDiscountPercent: (percent) => {
                set({ discountPercent: percent, discountAmount: 0 });
                get().recalculate();
            },

            addPayment: (payment) => {
                set((state) => ({
                    payments: [...state.payments, payment],
                }));
                get().recalculate();
            },

            removePayment: (index) => {
                set((state) => ({
                    payments: state.payments.filter((_, i) => i !== index),
                }));
                get().recalculate();
            },

            clearPayments: () => {
                set({ payments: [] });
                get().recalculate();
            },

            holdCurrentBill: (customerName) => {
                const state = get();
                const bill: HeldBill = {
                    id: `held-${Date.now()}`,
                    customerName: customerName || state.customerName,
                    customerId: state.customerId,
                    tableId: state.tableId,
                    tableName: state.tableName,
                    items: [...state.items],
                    notes: state.notes,
                    createdAt: new Date().toISOString(),
                    orderType: state.orderType,
                    discountAmount: state.discountAmount,
                    discountPercent: state.discountPercent,
                };

                set((s) => ({
                    heldBills: [...s.heldBills, bill],
                }));

                get().clearCart();
                return bill;
            },

            resumeBill: (bill) => {
                // Auto-hold current cart if it has items to prevent data loss
                const currentItems = get().items;
                if (currentItems.length > 0) {
                    get().holdCurrentBill();
                }

                set({
                    items: [...bill.items],
                    customerName: bill.customerName,
                    customerId: bill.customerId,
                    tableId: bill.tableId,
                    tableName: bill.tableName,
                    notes: bill.notes,
                    orderType: bill.orderType || 'dine_in',
                    discountAmount: bill.discountAmount || 0,
                    discountPercent: bill.discountPercent || 0,
                    payments: [],
                    lastUpdated: Date.now(),
                });
                get().removeHeldBill(bill.id);
                get().recalculate();
            },

            removeHeldBill: (billId) => {
                set((state) => ({
                    heldBills: state.heldBills.filter((b) => b.id !== billId),
                }));
            },

            clearCart: () => {
                set({
                    items: [],
                    customerId: undefined,
                    customerName: undefined,
                    tableId: undefined,
                    tableName: undefined,
                    orderType: 'dine_in',
                    notes: undefined,
                    discountAmount: 0,
                    discountPercent: 0,
                    payments: [],
                    lastUpdated: Date.now(),
                    subtotal: 0,
                    discountTotal: 0,
                    taxAmount: 0,
                    serviceCharge: 0,
                    total: 0,
                    totalPayments: 0,
                    changeDue: 0,
                });
            },

            recalculate: () => {
                const { taxRate, serviceChargeRate, taxInclusive } = useUIStore.getState();

                set((state) => {
                    // Calculate subtotal (round to avoid floating point noise with decimal quantities)
                    const subtotal = Math.round(state.items.reduce((sum, item) => {
                        const itemTotal = item.price * item.quantity;
                        const modifiersTotal = item.modifiers.reduce(
                            (m, mod) => m + mod.price * item.quantity,
                            0,
                        );
                        return sum + itemTotal + modifiersTotal;
                    }, 0));

                    // Calculate discount (clamp to subtotal to prevent negatives)
                    let discountTotal = Math.min(state.discountAmount, subtotal);
                    if (state.discountPercent > 0) {
                        discountTotal = Math.round((subtotal * state.discountPercent) / 100);
                    }

                    // After discount
                    const afterDiscount = subtotal - discountTotal;

                    // Service charge (only for dine-in)
                    const serviceCharge =
                        state.orderType === 'dine_in'
                            ? Math.round(afterDiscount * serviceChargeRate)
                            : 0;

                    // Tax calculation - matches backend logic
                    let taxAmount: number;
                    let total: number;

                    if (taxInclusive) {
                        // Tax-inclusive: prices already include tax, back-calculate for display
                        taxAmount = Math.round(((afterDiscount + serviceCharge) * taxRate) / (1 + taxRate));
                        total = Math.round((afterDiscount + serviceCharge) / 500) * 500;
                    } else {
                        // Tax-exclusive: add tax on top
                        taxAmount = Math.round((afterDiscount + serviceCharge) * taxRate);
                        total = Math.round((afterDiscount + serviceCharge + taxAmount) / 500) * 500;
                    }

                    // Total payments
                    const totalPayments = state.payments.reduce((sum, p) => sum + p.amount, 0);

                    // Change due
                    const changeDue = Math.max(0, totalPayments - total);

                    return {
                        subtotal,
                        discountTotal,
                        taxAmount,
                        serviceCharge,
                        total,
                        totalPayments,
                        changeDue,
                    };
                });
            },
        }),
        {
            name: 'tilo-pos-cart',
            partialize: (state) => ({
                items: state.items,
                orderType: state.orderType,
                heldBills: state.heldBills,
                customerId: state.customerId,
                customerName: state.customerName,
                tableId: state.tableId,
                tableName: state.tableName,
                notes: state.notes,
                discountAmount: state.discountAmount,
                discountPercent: state.discountPercent,
                lastUpdated: state.lastUpdated,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Clear stale cart data older than 24 hours
                    const lastUpdated = state.lastUpdated || 0;
                    if (Date.now() - lastUpdated > CART_EXPIRY_MS) {
                        state.items = [];
                        state.heldBills = [];
                        state.customerId = undefined;
                        state.customerName = undefined;
                        state.tableId = undefined;
                        state.tableName = undefined;
                        state.notes = undefined;
                        state.discountAmount = 0;
                        state.discountPercent = 0;
                        state.payments = [];
                    }
                    // Recalculate totals after hydration
                    state.recalculate();
                }
            },
        },
    ),
);
