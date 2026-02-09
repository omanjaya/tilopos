/**
 * Feature Registry Configuration
 *
 * Defines all available features that can be toggled per business.
 * This is the single source of truth for feature definitions.
 */

export type FeatureCategory = 'sales' | 'inventory' | 'marketing' | 'service' | 'advanced';

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: FeatureCategory;
  dependencies?: string[]; // Features that must be enabled
  conflicts?: string[]; // Features that cannot be enabled together
  defaultFor: string[]; // Business types where this is ON by default
  menuPaths?: string[]; // Menu paths to show/hide based on this feature
  icon?: string; // Icon name for UI
}

/**
 * All available features in TiloPOS
 */
export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // ============================================================================
  // SALES FEATURES (F&B focused)
  // ============================================================================
  {
    key: 'kitchen_display',
    label: 'Kitchen Display (KDS)',
    description: 'Tampilan dapur untuk melihat pesanan masuk dan status preparasi',
    category: 'sales',
    dependencies: ['order_management'],
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'fnb_fastfood'],
    menuPaths: ['/kds'],
    icon: 'MonitorPlay',
  },
  {
    key: 'table_management',
    label: 'Manajemen Meja',
    description: 'Denah meja, status occupied/available, merge & split bill',
    category: 'sales',
    defaultFor: ['fnb_restaurant'],
    menuPaths: ['/app/tables'],
    icon: 'LayoutGrid',
  },
  {
    key: 'order_management',
    label: 'Pesanan Dapur',
    description: 'Order queue dan status tracking untuk dapur',
    category: 'sales',
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'fnb_fastfood'],
    menuPaths: ['/app/orders'],
    icon: 'ClipboardList',
  },
  {
    key: 'waiting_list',
    label: 'Daftar Tunggu',
    description: 'Reservasi dan antrian pelanggan',
    category: 'sales',
    defaultFor: ['fnb_restaurant', 'service_salon'],
    menuPaths: ['/app/waiting-list'],
    icon: 'ListPlus',
  },
  {
    key: 'modifiers',
    label: 'Modifier Produk',
    description: 'Opsi tambahan seperti ukuran, topping, level pedas',
    category: 'sales',
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'fnb_fastfood'],
    menuPaths: ['/app/settings/modifiers'],
    icon: 'ListPlus',
  },
  {
    key: 'self_order_qr',
    label: 'Self Order QR',
    description: 'Pelanggan bisa order sendiri via scan QR',
    category: 'sales',
    defaultFor: ['fnb_restaurant', 'fnb_cafe'],
    menuPaths: ['/app/self-order'],
    icon: 'QrCode',
  },
  {
    key: 'order_types',
    label: 'Tipe Pesanan',
    description: 'Dine-in, Takeaway, Delivery',
    category: 'sales',
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'fnb_fastfood'],
    icon: 'Utensils',
  },

  // ============================================================================
  // INVENTORY FEATURES (Retail focused)
  // ============================================================================
  {
    key: 'barcode_scanning',
    label: 'Barcode Scanner',
    description: 'Input produk dengan scan barcode di POS',
    category: 'inventory',
    defaultFor: ['retail_grocery', 'retail_fashion', 'retail_hardware', 'retail_electronics'],
    icon: 'Barcode',
  },
  {
    key: 'stock_management',
    label: 'Manajemen Stok',
    description: 'Stock opname, stock alert, dan tracking stok',
    category: 'inventory',
    defaultFor: [
      'retail_grocery',
      'retail_fashion',
      'retail_hardware',
      'retail_electronics',
      'wholesale',
    ],
    menuPaths: ['/app/inventory/stock'],
    icon: 'Warehouse',
  },
  {
    key: 'stock_transfer',
    label: 'Transfer Stok',
    description: 'Transfer stok antar outlet',
    category: 'inventory',
    dependencies: ['stock_management'],
    defaultFor: ['retail_grocery', 'retail_hardware', 'wholesale'],
    menuPaths: ['/app/inventory/transfers'],
    icon: 'ArrowLeftRight',
  },
  {
    key: 'supplier_management',
    label: 'Manajemen Supplier',
    description: 'Database supplier dan kontak',
    category: 'inventory',
    defaultFor: ['retail_grocery', 'retail_hardware', 'wholesale'],
    menuPaths: ['/app/inventory/suppliers'],
    icon: 'Truck',
  },
  {
    key: 'purchase_orders',
    label: 'Purchase Order',
    description: 'Buat PO dan receiving barang',
    category: 'inventory',
    dependencies: ['supplier_management'],
    defaultFor: ['retail_grocery', 'retail_hardware', 'wholesale'],
    menuPaths: ['/app/inventory/purchase-orders'],
    icon: 'ClipboardList',
  },
  {
    key: 'product_variants',
    label: 'Varian Produk',
    description: 'Produk dengan varian size, color, dll',
    category: 'inventory',
    defaultFor: ['retail_fashion', 'retail_hardware'],
    icon: 'Layers',
  },
  {
    key: 'unit_conversion',
    label: 'Konversi Satuan',
    description: 'Beli dalam dus, jual per pcs',
    category: 'inventory',
    dependencies: ['stock_management'],
    defaultFor: ['retail_hardware', 'wholesale'],
    menuPaths: ['/app/inventory/unit-conversion'],
    icon: 'RefreshCw',
  },
  {
    key: 'serial_number',
    label: 'Serial Number',
    description: 'Tracking per unit produk (untuk elektronik)',
    category: 'inventory',
    dependencies: ['stock_management'],
    defaultFor: ['retail_electronics'],
    menuPaths: ['/app/inventory/serial-numbers'],
    icon: 'Hash',
  },
  {
    key: 'batch_tracking',
    label: 'Batch/Lot Tracking',
    description: 'Tracking expired date dan batch',
    category: 'inventory',
    dependencies: ['stock_management'],
    defaultFor: [],
    menuPaths: ['/app/inventory/batch-tracking'],
    icon: 'Calendar',
  },
  {
    key: 'ingredient_tracking',
    label: 'Tracking Bahan Baku',
    description: 'Resep, HPP, dan deduct otomatis bahan',
    category: 'inventory',
    defaultFor: ['fnb_restaurant', 'fnb_cafe'],
    menuPaths: ['/app/ingredients'],
    icon: 'FlaskConical',
  },
  {
    key: 'price_tiers',
    label: 'Harga Bertingkat',
    description: 'Harga berbeda untuk grosir vs retail',
    category: 'inventory',
    defaultFor: ['wholesale', 'retail_hardware'],
    menuPaths: ['/app/inventory/price-tiers'],
    icon: 'TrendingUp',
  },

  // ============================================================================
  // SERVICE FEATURES
  // ============================================================================
  {
    key: 'appointments',
    label: 'Appointment/Booking',
    description: 'Jadwal layanan dan booking',
    category: 'service',
    defaultFor: ['service_salon', 'service_workshop'],
    menuPaths: ['/app/appointments'],
    icon: 'Calendar',
  },
  {
    key: 'staff_assignment',
    label: 'Penugasan Staff',
    description: 'Assign service ke karyawan tertentu',
    category: 'service',
    defaultFor: ['service_salon'],
    icon: 'UserCheck',
  },
  {
    key: 'service_duration',
    label: 'Durasi Layanan',
    description: 'Estimasi waktu per layanan',
    category: 'service',
    dependencies: ['appointments'],
    defaultFor: ['service_salon'],
    icon: 'Clock',
  },
  {
    key: 'work_orders',
    label: 'Work Order',
    description: 'Tracking pekerjaan untuk bengkel/service',
    category: 'service',
    defaultFor: ['service_workshop'],
    menuPaths: ['/app/work-orders'],
    icon: 'Wrench',
  },
  {
    key: 'item_tracking',
    label: 'Tracking Item Customer',
    description: 'Tracking item laundry atau service',
    category: 'service',
    defaultFor: ['service_laundry'],
    menuPaths: ['/app/item-tracking'],
    icon: 'Package',
  },

  // ============================================================================
  // MARKETING FEATURES
  // ============================================================================
  {
    key: 'customer_loyalty',
    label: 'Program Loyalty',
    description: 'Poin dan reward untuk pelanggan',
    category: 'marketing',
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'retail_fashion', 'service_salon'],
    menuPaths: ['/app/loyalty'],
    icon: 'Heart',
  },
  {
    key: 'promotions',
    label: 'Promosi',
    description: 'Diskon, buy X get Y, happy hour',
    category: 'marketing',
    defaultFor: [
      'fnb_restaurant',
      'fnb_cafe',
      'fnb_fastfood',
      'retail_grocery',
      'retail_fashion',
      'retail_hardware',
    ],
    menuPaths: ['/app/promotions'],
    icon: 'Tag',
  },
  {
    key: 'vouchers',
    label: 'Voucher',
    description: 'Kode voucher untuk diskon',
    category: 'marketing',
    defaultFor: ['fnb_restaurant', 'fnb_cafe', 'retail_fashion'],
    menuPaths: ['/app/promotions/vouchers'],
    icon: 'Ticket',
  },
  {
    key: 'customer_segments',
    label: 'Segmentasi Pelanggan',
    description: 'Grouping customer untuk targeting',
    category: 'marketing',
    defaultFor: [],
    menuPaths: ['/app/customers/segments'],
    icon: 'Filter',
  },
  {
    key: 'online_store',
    label: 'Toko Online',
    description: 'Integrasi marketplace dan online store',
    category: 'marketing',
    defaultFor: ['retail_fashion', 'retail_electronics'],
    menuPaths: ['/app/online-store'],
    icon: 'Globe',
  },

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================
  {
    key: 'multi_outlet',
    label: 'Multi Outlet',
    description: 'Kelola banyak outlet dari satu dashboard',
    category: 'advanced',
    defaultFor: [],
    menuPaths: ['/app/settings/outlets'],
    icon: 'Building2',
  },
  {
    key: 'multi_warehouse',
    label: 'Multi Gudang',
    description: 'Stok di beberapa lokasi gudang',
    category: 'advanced',
    dependencies: ['stock_management'],
    defaultFor: ['wholesale'],
    icon: 'Warehouse',
  },
  {
    key: 'reports_advanced',
    label: 'Laporan Lanjutan',
    description: 'Custom report builder dan export',
    category: 'advanced',
    defaultFor: [],
    icon: 'BarChart3',
  },
  {
    key: 'audit_log',
    label: 'Audit Log',
    description: 'Tracking semua aktivitas sistem',
    category: 'advanced',
    defaultFor: [],
    menuPaths: ['/app/audit'],
    icon: 'ScrollText',
  },
  {
    key: 'api_integration',
    label: 'Integrasi API',
    description: 'Integrasi dengan marketplace dan accounting',
    category: 'advanced',
    defaultFor: [],
    icon: 'Plug',
  },
  {
    key: 'offline_mode',
    label: 'Mode Offline',
    description: 'Transaksi tanpa koneksi internet',
    category: 'advanced',
    defaultFor: [],
    icon: 'WifiOff',
  },
];

/**
 * Get feature definition by key
 */
export function getFeatureByKey(key: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find((f) => f.key === key);
}

/**
 * Get all features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.category === category);
}

/**
 * Get all feature keys
 */
export function getAllFeatureKeys(): string[] {
  return FEATURE_REGISTRY.map((f) => f.key);
}

/**
 * Get features that should be enabled by default for a business type
 */
export function getDefaultFeaturesForType(businessType: string): string[] {
  return FEATURE_REGISTRY.filter((f) => f.defaultFor.includes(businessType)).map((f) => f.key);
}

/**
 * Check if a feature has all its dependencies met
 */
export function checkFeatureDependencies(
  featureKey: string,
  enabledFeatures: string[],
): { valid: boolean; missingDependencies: string[] } {
  const feature = getFeatureByKey(featureKey);
  if (!feature || !feature.dependencies) {
    return { valid: true, missingDependencies: [] };
  }

  const missingDependencies = feature.dependencies.filter((dep) => !enabledFeatures.includes(dep));
  return {
    valid: missingDependencies.length === 0,
    missingDependencies,
  };
}

/**
 * Get menu paths that should be visible based on enabled features
 */
export function getVisibleMenuPaths(enabledFeatures: string[]): string[] {
  const paths: string[] = [];
  for (const feature of FEATURE_REGISTRY) {
    if (enabledFeatures.includes(feature.key) && feature.menuPaths) {
      paths.push(...feature.menuPaths);
    }
  }
  return paths;
}
