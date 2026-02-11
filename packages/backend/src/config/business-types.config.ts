/**
 * Business Type Presets Configuration
 *
 * Defines all available business types and their default feature configurations.
 */

export interface BusinessTypePreset {
  code: string;
  label: string;
  description: string;
  icon: string;
  category: 'fnb' | 'retail' | 'service' | 'wholesale' | 'custom';
  examples: string[];
  defaultFeatures: string[];
  optionalFeatures: string[];
}

/**
 * All available business type presets
 */
export const BUSINESS_TYPE_PRESETS: BusinessTypePreset[] = [
  // ============================================================================
  // F&B BUSINESS TYPES
  // ============================================================================
  {
    code: 'fnb_restaurant',
    label: 'Restoran',
    description: 'Full-service restaurant dengan meja dan dapur',
    icon: 'Utensils',
    category: 'fnb',
    examples: ['Restoran Padang', 'Seafood Restaurant', 'Chinese Food', 'Korean BBQ'],
    defaultFeatures: [
      'kitchen_display',
      'table_management',
      'order_management',
      'waiting_list',
      'modifiers',
      'order_types',
      'ingredient_tracking',
      'self_order_qr',
      'customer_loyalty',
      'promotions',
      'vouchers',
    ],
    optionalFeatures: [
      'stock_management',
      'supplier_management',
      'purchase_orders',
      'staff_assignment',
      'multi_outlet',
    ],
  },
  {
    code: 'fnb_cafe',
    label: 'Cafe & Coffee Shop',
    description: 'Quick-service F&B dengan fokus takeaway',
    icon: 'Coffee',
    category: 'fnb',
    examples: ['Coffee Shop', 'Bubble Tea', 'Juice Bar', 'Bakery'],
    defaultFeatures: [
      'kitchen_display',
      'order_management',
      'modifiers',
      'order_types',
      'ingredient_tracking',
      'self_order_qr',
      'customer_loyalty',
      'promotions',
    ],
    optionalFeatures: [
      'table_management',
      'waiting_list',
      'stock_management',
      'vouchers',
      'multi_outlet',
    ],
  },
  {
    code: 'fnb_fastfood',
    label: 'Fast Food',
    description: 'Counter service dengan fokus kecepatan',
    icon: 'Beef',
    category: 'fnb',
    examples: ['Fried Chicken', 'Burger', 'Pizza', 'Food Court Stall'],
    defaultFeatures: [
      'kitchen_display',
      'order_management',
      'modifiers',
      'order_types',
      'promotions',
    ],
    optionalFeatures: [
      'ingredient_tracking',
      'self_order_qr',
      'customer_loyalty',
      'stock_management',
    ],
  },

  // ============================================================================
  // RETAIL BUSINESS TYPES
  // ============================================================================
  {
    code: 'retail_grocery',
    label: 'Toko Kelontong',
    description: 'Retail dengan barcode dan manajemen stok',
    icon: 'ShoppingCart',
    category: 'retail',
    examples: ['Minimarket', 'Supermarket', 'Toko Sembako', 'Warung'],
    defaultFeatures: [
      'barcode_scanning',
      'stock_management',
      'supplier_management',
      'purchase_orders',
      'stock_transfer',
      'promotions',
      'customer_loyalty',
    ],
    optionalFeatures: [
      'batch_tracking',
      'price_tiers',
      'multi_outlet',
      'multi_warehouse',
      'online_store',
    ],
  },
  {
    code: 'retail_fashion',
    label: 'Fashion & Boutique',
    description: 'Produk dengan varian ukuran dan warna',
    icon: 'Shirt',
    category: 'retail',
    examples: ['Toko Baju', 'Toko Sepatu', 'Aksesoris', 'Distro'],
    defaultFeatures: [
      'barcode_scanning',
      'stock_management',
      'product_variants',
      'customer_loyalty',
      'promotions',
      'vouchers',
      'online_store',
    ],
    optionalFeatures: [
      'supplier_management',
      'purchase_orders',
      'customer_segments',
      'multi_outlet',
    ],
  },
  {
    code: 'retail_hardware',
    label: 'Toko Bangunan',
    description: 'Produk dengan satuan beragam dan stok besar',
    icon: 'Hammer',
    category: 'retail',
    examples: ['Toko Bangunan', 'Toko Material', 'Toko Alat', 'Toko Cat'],
    defaultFeatures: [
      'barcode_scanning',
      'stock_management',
      'supplier_management',
      'purchase_orders',
      'stock_transfer',
      'product_variants',
      'unit_conversion',
      'price_tiers',
      'promotions',
      'credit_sales',
      'decimal_quantities',
      'excel_import',
      'pos_price_editing',
    ],
    optionalFeatures: ['multi_outlet', 'multi_warehouse', 'customer_loyalty'],
  },
  {
    code: 'retail_electronics',
    label: 'Elektronik',
    description: 'Serial number tracking untuk produk elektronik',
    icon: 'Smartphone',
    category: 'retail',
    examples: ['Toko HP', 'Laptop', 'Aksesoris Elektronik', 'Service Center'],
    defaultFeatures: [
      'barcode_scanning',
      'stock_management',
      'serial_number',
      'supplier_management',
      'purchase_orders',
      'customer_loyalty',
      'online_store',
    ],
    optionalFeatures: ['work_orders', 'product_variants', 'promotions', 'multi_outlet'],
  },

  // ============================================================================
  // SERVICE BUSINESS TYPES
  // ============================================================================
  {
    code: 'service_salon',
    label: 'Salon & Barbershop',
    description: 'Layanan berbasis appointment dan staff',
    icon: 'Scissors',
    category: 'service',
    examples: ['Salon', 'Barbershop', 'Spa', 'Nail Art'],
    defaultFeatures: [
      'appointments',
      'staff_assignment',
      'service_duration',
      'waiting_list',
      'customer_loyalty',
      'promotions',
    ],
    optionalFeatures: ['stock_management', 'vouchers', 'customer_segments'],
  },
  {
    code: 'service_laundry',
    label: 'Laundry',
    description: 'Item tracking untuk laundry',
    icon: 'Shirt',
    category: 'service',
    examples: ['Laundry Kiloan', 'Dry Cleaning', 'Laundry Sepatu'],
    defaultFeatures: ['item_tracking', 'customer_loyalty', 'promotions'],
    optionalFeatures: ['appointments', 'stock_management', 'vouchers'],
  },
  {
    code: 'service_workshop',
    label: 'Bengkel & Service',
    description: 'Work order untuk bengkel dan service',
    icon: 'Wrench',
    category: 'service',
    examples: ['Bengkel Motor', 'Bengkel Mobil', 'Service AC', 'Service Elektronik'],
    defaultFeatures: [
      'work_orders',
      'appointments',
      'stock_management',
      'supplier_management',
      'customer_loyalty',
    ],
    optionalFeatures: ['staff_assignment', 'serial_number', 'purchase_orders'],
  },

  // ============================================================================
  // WHOLESALE
  // ============================================================================
  {
    code: 'wholesale',
    label: 'Grosir',
    description: 'Harga bertingkat untuk distributor dan agen',
    icon: 'Warehouse',
    category: 'wholesale',
    examples: ['Distributor', 'Agen', 'Supplier'],
    defaultFeatures: [
      'barcode_scanning',
      'stock_management',
      'supplier_management',
      'purchase_orders',
      'stock_transfer',
      'unit_conversion',
      'price_tiers',
      'multi_warehouse',
      'promotions',
      'credit_sales',
      'decimal_quantities',
      'excel_import',
    ],
    optionalFeatures: ['multi_outlet', 'customer_segments', 'api_integration'],
  },

  // ============================================================================
  // CUSTOM (User picks features manually)
  // ============================================================================
  {
    code: 'custom',
    label: 'Custom',
    description: 'Pilih fitur sesuai kebutuhan bisnis Anda',
    icon: 'Settings',
    category: 'custom',
    examples: ['Bisnis unik', 'Kombinasi custom'],
    defaultFeatures: [],
    optionalFeatures: [], // All features are optional
  },
];

/**
 * Get business type preset by code
 */
export function getBusinessTypePreset(code: string): BusinessTypePreset | undefined {
  return BUSINESS_TYPE_PRESETS.find((bt) => bt.code === code);
}

/**
 * Get all business types by category
 */
export function getBusinessTypesByCategory(
  category: BusinessTypePreset['category'],
): BusinessTypePreset[] {
  return BUSINESS_TYPE_PRESETS.filter((bt) => bt.category === category);
}

/**
 * Get all business type codes
 */
export function getAllBusinessTypeCodes(): string[] {
  return BUSINESS_TYPE_PRESETS.map((bt) => bt.code);
}

/**
 * Validate if a business type code is valid
 */
export function isValidBusinessType(code: string): boolean {
  return BUSINESS_TYPE_PRESETS.some((bt) => bt.code === code);
}
