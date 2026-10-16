// POS Terminal Types

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type PaymentMethod =
    | 'cash'
    | 'card'
    | 'bank_transfer'
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
    bundleId?: string;
    name: string;
    variantName?: string;
    price: number;
    originalPrice?: number; // Original price before editing
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
    businessId?: string;
    outletId?: string;
    employeeId?: string;
    syncState?: 'pending' | 'uncertain' | 'synced';
    pendingAction?: 'resume' | 'delete';
    requestId?: string;
    actionEmployeeId?: string;
    subtotal?: number;
    discountTotal?: number;
    customerName?: string;
    customerId?: string;
    tableId?: string;
    tableName?: string;
    items: CartItem[];
    notes?: string;
    createdAt: string;
    employeeName?: string;
    orderType?: 'dine_in' | 'takeaway' | 'delivery';
    discountAmount?: number;
    discountPercent?: number;
}

// API Request/Response Types

export interface DiscountRequest {
    type: 'percentage' | 'fixed';
    value: number;
    promotionId?: string;
    voucherCode?: string;
}

/** POST /pos/transactions body (backend CreateTransactionDto); the employee comes from the JWT. */
export interface CreateTransactionRequest {
    outletId: string;
    customerId?: string;
    shiftId: string;
    orderType: OrderType;
    tableId?: string;
    items: TransactionItemRequest[];
    payments: PaymentRequest[];
    discounts?: DiscountRequest[];
    notes?: string;
    /** Idempotency key (UUID): a replay returns the original sale with duplicate: true. */
    clientTransactionId?: string;
    /** ISO time of the sale on the device (offline sync); max 7 days old. */
    occurredAt?: string;
}

/** POST /pos/transactions/preview body: server-side totals, no side effects. */
export interface PreviewTransactionRequest {
    outletId?: string;
    customerId?: string;
    orderType: OrderType;
    items: TransactionItemRequest[];
    discounts?: DiscountRequest[];
    /** Decides cash rounding: Rp500 rounding applies only when every payment is cash. */
    payments?: PaymentRequest[];
}

export interface PreviewTransactionResponse {
    subtotal: number;
    discountAmount: number;
    serviceCharge: number;
    taxAmount: number;
    roundingAmount: number;
    grandTotal: number;
    items: {
        productId: string | null;
        variantId: string | null;
        bundleId: string | null;
        productName: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
    }[];
    discounts: {
        source: string;
        promotionId: string | null;
        voucherId: string | null;
        amount: number;
    }[];
}

export interface TransactionItemRequest {
    productId?: string;
    variantId?: string;
    bundleId?: string;
    quantity: number;
    modifierIds?: string[];
    notes?: string;
    unitPrice?: number;
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
    /** Cash rounding (total = subtotal - discount + tax + service + roundingAmount). */
    roundingAmount?: number;
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
    | 'partially_refunded'
    | 'credit'
    | 'partially_paid'
    | 'split';

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

export interface CreateTransactionResponse {
    transactionId: string;
    receiptNumber: string;
    grandTotal: number;
    roundingAmount: number;
    change: number;
    loyaltyPointsEarned: number;
    /** True when an earlier submission with the same clientTransactionId was returned. */
    duplicate?: boolean;
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
        id?: string;
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
    /** Optional table info for F&B */
    table?: {
        name: string;
    };
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

export interface POSBundle {
    id: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    items: POSBundleItem[];
}

export interface POSBundleItem {
    productId: string;
    variantId?: string | null;
    productName: string;
    variantName?: string | null;
    quantity: number;
    modifierGroups: POSModifierGroup[];
}
