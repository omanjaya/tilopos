import { create } from 'zustand';

interface FeatureState {
  enabledFeatures: string[];
  isLoaded: boolean;
  businessType: string | null;
  setEnabledFeatures: (features: string[]) => void;
  setBusinessType: (type: string | null) => void;
  isFeatureEnabled: (featureKey: string) => boolean;
  isPathVisible: (path: string) => boolean;
}

/**
 * Maps feature keys to the menu paths they control.
 * Paths NOT in this map are always visible (e.g. Dashboard, Products, etc.)
 */
const FEATURE_PATH_MAP: Record<string, string[]> = {
  kitchen_display: ['/kds'],
  table_management: ['/app/tables'],
  order_management: ['/app/orders'],
  waiting_list: ['/app/waiting-list'],
  modifiers: ['/app/settings/modifiers'],
  self_order_qr: ['/app/self-order'],
  stock_management: ['/app/inventory/stock'],
  stock_transfer: ['/app/inventory/transfers'],
  supplier_management: ['/app/inventory/suppliers'],
  purchase_orders: ['/app/inventory/purchase-orders'],
  price_tiers: ['/app/inventory/price-tiers'],
  unit_conversion: ['/app/inventory/unit-conversion'],
  batch_tracking: ['/app/inventory/batch-tracking'],
  ingredient_tracking: ['/app/ingredients'],
  serial_number: ['/app/inventory/serial-numbers'],
  appointments: ['/app/appointments'],
  work_orders: ['/app/work-orders'],
  item_tracking: ['/app/item-tracking'],
  customer_loyalty: ['/app/loyalty'],
  promotions: ['/app/promotions'],
  vouchers: ['/app/promotions/vouchers'],
  customer_segments: ['/app/customers/segments'],
  online_store: ['/app/online-store'],
  multi_outlet: ['/app/settings/outlets'],
  audit_log: ['/app/audit'],
};

// Build reverse map: path -> feature keys that control it
const PATH_FEATURE_MAP: Record<string, string[]> = {};
for (const [feature, paths] of Object.entries(FEATURE_PATH_MAP)) {
  for (const path of paths) {
    if (!PATH_FEATURE_MAP[path]) {
      PATH_FEATURE_MAP[path] = [];
    }
    PATH_FEATURE_MAP[path].push(feature);
  }
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  enabledFeatures: [],
  isLoaded: false,
  businessType: null,

  setEnabledFeatures: (features) => set({ enabledFeatures: features, isLoaded: true }),

  setBusinessType: (type) => set({ businessType: type }),

  isFeatureEnabled: (featureKey) => {
    return get().enabledFeatures.includes(featureKey);
  },

  isPathVisible: (path) => {
    const { enabledFeatures, isLoaded, businessType } = get();

    // If features haven't loaded yet, show everything
    if (!isLoaded) return true;

    // For custom business type, show all paths (user will configure features manually)
    if (businessType === 'custom') return true;

    // Check if this path is controlled by any feature
    const requiredFeatures = PATH_FEATURE_MAP[path];

    // If no feature controls this path, it's always visible
    if (!requiredFeatures || requiredFeatures.length === 0) return true;

    // Path is visible if ANY of its controlling features are enabled
    return requiredFeatures.some((f) => enabledFeatures.includes(f));
  },
}));
