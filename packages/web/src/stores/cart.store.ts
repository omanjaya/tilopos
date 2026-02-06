import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartModifier, OrderType, PaymentEntry, HeldBill } from '@/types/pos.types';

// Generate unique ID for cart items
const generateCartItemId = () => `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

// Tax rate (should come from settings)
const TAX_RATE = 0.11; // 11% PPN
const SERVICE_CHARGE_RATE = 0.05; // 5% service charge
const MAX_ITEM_QUANTITY = 9999;

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            orderType: 'dine_in',
            discountAmount: 0,
            discountPercent: 0,
            payments: [],
            heldBills: [],
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
                    // Check if same product/variant exists
                    const existingIndex = state.items.findIndex(
                        (i) =>
                            i.productId === item.productId &&
                            i.variantId === item.variantId &&
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
                        return { items: newItems };
                    } else {
                        // Add new item with generated id
                        const newItem: CartItem = {
                            id: generateCartItemId(),
                            productId: item.productId,
                            variantId: item.variantId,
                            name: item.name,
                            variantName: item.variantName,
                            price: item.price,
                            quantity: item.quantity,
                            modifiers: item.modifiers,
                            notes: item.notes,
                            imageUrl: item.imageUrl,
                        };
                        return { items: [...state.items, newItem] };
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
                }));
                get().recalculate();
            },

            removeItem: (itemId) => {
                set((state) => ({
                    items: state.items.filter((i) => i.id !== itemId),
                }));
                get().recalculate();
            },

            updateItemNotes: (itemId, notes) => {
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === itemId ? { ...i, notes } : i,
                    ),
                }));
            },

            updateItemModifiers: (itemId, modifiers) => {
                set((state) => ({
                    items: state.items.map((i) =>
                        i.id === itemId ? { ...i, modifiers } : i,
                    ),
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
                    tableId: state.tableId,
                    tableName: state.tableName,
                    items: [...state.items],
                    notes: state.notes,
                    createdAt: new Date().toISOString(),
                };

                set((s) => ({
                    heldBills: [...s.heldBills, bill],
                }));

                get().clearCart();
                return bill;
            },

            resumeBill: (bill) => {
                set({
                    items: [...bill.items],
                    customerName: bill.customerName,
                    tableId: bill.tableId,
                    tableName: bill.tableName,
                    notes: bill.notes,
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
                set((state) => {
                    // Calculate subtotal
                    const subtotal = state.items.reduce((sum, item) => {
                        const itemTotal = item.price * item.quantity;
                        const modifiersTotal = item.modifiers.reduce(
                            (m, mod) => m + mod.price * item.quantity,
                            0,
                        );
                        return sum + itemTotal + modifiersTotal;
                    }, 0);

                    // Calculate discount
                    let discountTotal = state.discountAmount;
                    if (state.discountPercent > 0) {
                        discountTotal = (subtotal * state.discountPercent) / 100;
                    }

                    // After discount
                    const afterDiscount = subtotal - discountTotal;

                    // Service charge (only for dine-in)
                    const serviceCharge =
                        state.orderType === 'dine_in'
                            ? Math.round(afterDiscount * SERVICE_CHARGE_RATE)
                            : 0;

                    // Tax
                    const taxAmount = Math.round((afterDiscount + serviceCharge) * TAX_RATE);

                    // Total
                    const total = afterDiscount + serviceCharge + taxAmount;

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
                payments: state.payments,
            }),
            onRehydrateStorage: () => (state) => {
                // Recalculate totals after hydration
                if (state) {
                    state.recalculate();
                }
            },
        },
    ),
);
