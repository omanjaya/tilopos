// POS Terminal Types

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type PaymentMethod =
    | 'cash'
    | 'debit_card'
    | 'credit_card'
    | 'qris'
    | 'gopay'
    | 'ovo'
    | 'dana'
    | 'shopeepay'
    | 'linkaja';

export interface CartItem {
    id: string; // unique cart item id
    productId: string;
    variantId?: string;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    modifiers: CartModifier[];
    notes?: string;
    imageUrl?: string;
}

export interface CartModifier {
    id: string;
    name: string;
    price: number;
}

export interface Cart {
    items: CartItem[];
    customerId?: string;
    customerName?: string;
    tableId?: string;
    tableName?: string;
    orderType: OrderType;
    notes?: string;
    discountAmount: number;
    discountPercent: number;
}

export interface PaymentEntry {
    method: PaymentMethod;
    amount: number;
    referenceNumber?: string;
}

export interface HeldBill {
    id: string;
    customerName?: string;
    tableId?: string;
    tableName?: string;
    items: CartItem[];
    notes?: string;
    createdAt: string;
    employeeName?: string;
}

// API Request/Response Types

export interface CreateTransactionRequest {
    outletId: string;
    employeeId: string;
    customerId?: string;
    shiftId: string;
    orderType: OrderType;
    tableId?: string;
    items: TransactionItemRequest[];
    payments: PaymentRequest[];
    notes?: string;
}

export interface TransactionItemRequest {
    productId: string;
    variantId?: string;
    quantity: number;
    modifierIds?: string[];
    notes?: string;
}

export interface PaymentRequest {
    method: string;
    amount: number;
    referenceNumber?: string;
}

export interface Transaction {
    id: string;
    transactionNumber: string;
    outletId: string;
    employeeId: string;
    customerId?: string;
    orderType: OrderType;
    status: TransactionStatus;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    serviceCharge: number;
    total: number;
    paidAmount: number;
    changeAmount: number;
    items: TransactionItem[];
    payments: Payment[];
    notes?: string;
    createdAt: string;
    completedAt?: string;
}

export type TransactionStatus =
    | 'pending'
    | 'completed'
    | 'voided'
    | 'refunded'
    | 'partially_refunded';

export interface TransactionItem {
    id: string;
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discountAmount: number;
    modifiers: TransactionModifier[];
    notes?: string;
}

export interface TransactionModifier {
    id: string;
    name: string;
    price: number;
}

export interface Payment {
    id: string;
    method: PaymentMethod;
    amount: number;
    referenceNumber?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    createdAt: string;
}

export interface ReceiptData {
    transaction: Transaction;
    business: {
        name: string;
        address: string;
        phone: string;
        taxId?: string;
    };
    outlet: {
        name: string;
        address: string;
        phone: string;
    };
    employee: {
        name: string;
    };
    customer?: {
        name: string;
        phone?: string;
    };
}

// Cash Drawer

export interface CashDrawerEntry {
    type: 'cash_in' | 'cash_out';
    amount: number;
    reason?: string;
    notes?: string;
}

// Category with products for POS display

export interface POSCategory {
    id: string;
    name: string;
    productCount: number;
}

export interface POSProduct {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    imageUrl?: string;
    categoryId?: string;
    categoryName?: string;
    variants: POSProductVariant[];
    modifierGroups: POSModifierGroup[];
    trackStock: boolean;
    stockLevel?: number;
}

export interface POSProductVariant {
    id: string;
    name: string;
    price: number;
    stockLevel?: number;
}

export interface POSModifierGroup {
    id: string;
    name: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    modifiers: POSModifier[];
}

export interface POSModifier {
    id: string;
    name: string;
    price: number;
}
