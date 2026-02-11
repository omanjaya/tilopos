/**
 * Feature keys constants for type-safety and autocomplete
 * These should match the backend FEATURE_REGISTRY keys
 */
export const FEATURES = {
    // Sales
    KITCHEN_DISPLAY: 'kitchen_display',
    TABLE_MANAGEMENT: 'table_management',
    ORDER_MANAGEMENT: 'order_management',
    WAITING_LIST: 'waiting_list',
    MODIFIERS: 'modifiers',
    SELF_ORDER_QR: 'self_order_qr',
    ORDER_TYPES: 'order_types',
    POS_PRICE_EDITING: 'pos_price_editing',
    CREDIT_SALES: 'credit_sales',
    DECIMAL_QUANTITIES: 'decimal_quantities',

    // Inventory
    BARCODE_SCANNING: 'barcode_scanning',
    STOCK_MANAGEMENT: 'stock_management',
    STOCK_TRANSFER: 'stock_transfer',
    SUPPLIER_MANAGEMENT: 'supplier_management',
    PURCHASE_ORDERS: 'purchase_orders',
    PRODUCT_VARIANTS: 'product_variants',
    UNIT_CONVERSION: 'unit_conversion',
    SERIAL_NUMBER: 'serial_number',
    BATCH_TRACKING: 'batch_tracking',
    INGREDIENT_TRACKING: 'ingredient_tracking',
    PRICE_TIERS: 'price_tiers',

    // Service
    APPOINTMENTS: 'appointments',
    STAFF_ASSIGNMENT: 'staff_assignment',
    STAFF_COMMISSION: 'staff_commission',
    SERVICE_DURATION: 'service_duration',
    WORK_ORDERS: 'work_orders',
    ITEM_TRACKING: 'item_tracking',

    // Marketing
    CUSTOMER_LOYALTY: 'customer_loyalty',
    PROMOTIONS: 'promotions',
    VOUCHERS: 'vouchers',
    CUSTOMER_SEGMENTS: 'customer_segments',
    ONLINE_STORE: 'online_store',

    // Advanced
    MULTI_OUTLET: 'multi_outlet',
    MULTI_WAREHOUSE: 'multi_warehouse',
    REPORTS_ADVANCED: 'reports_advanced',
    AUDIT_LOG: 'audit_log',
    API_INTEGRATION: 'api_integration',
    OFFLINE_MODE: 'offline_mode',
    EXCEL_IMPORT: 'excel_import',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];
