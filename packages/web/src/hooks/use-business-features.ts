import { useMemo } from 'react';
import { useFeatureStore } from '@/stores/feature.store';
import { FEATURES, type FeatureKey } from '@/lib/feature-keys';

/**
 * Business type categories for type-safe checks
 */
export type BusinessCategory = 'fnb' | 'retail' | 'service' | 'wholesale' | 'custom';

/**
 * useBusinessFeatures - Comprehensive hook for business-type-aware feature checks
 * 
 * Provides utilities to check enabled features and business type context
 * 
 * @example
 * const { 
 *   isEnabled, 
 *   isFnB, 
 *   isRetail, 
 *   enabledFeatures,
 *   hasTableManagement,
 *   hasModifiers
 * } = useBusinessFeatures();
 */
export function useBusinessFeatures() {
    const enabledFeatures = useFeatureStore((s) => s.enabledFeatures);
    const businessType = useFeatureStore((s) => s.businessType);
    const outletType = useFeatureStore((s) => s.outletType);
    const isLoaded = useFeatureStore((s) => s.isLoaded);
    const isFeatureEnabled = useFeatureStore((s) => s.isFeatureEnabled);

    return useMemo(() => {
        // Use outlet type if available, fallback to business type
        const activeType = outletType || businessType;

        // Business/outlet type helpers
        const isFnB = activeType?.startsWith('fnb_') ?? false;
        const isRetail = activeType?.startsWith('retail_') ?? false;
        const isService = activeType?.startsWith('service_') ?? false;
        const isWholesale = activeType === 'wholesale';
        const isCustom = activeType === 'custom';

        // Get category from active type (outlet or business)
        const getCategory = (): BusinessCategory | null => {
            if (!activeType) return null;
            if (activeType.startsWith('fnb_')) return 'fnb';
            if (activeType.startsWith('retail_')) return 'retail';
            if (activeType.startsWith('service_')) return 'service';
            if (activeType === 'wholesale') return 'wholesale';
            if (activeType === 'custom') return 'custom';
            return null;
        };

        // Feature check wrapper (considers custom type)
        const isEnabled = (feature: FeatureKey | string): boolean => {
            if (isCustom) return true; // Custom shows all
            return isFeatureEnabled(feature);
        };

        // Check multiple features (ANY)
        const hasAnyFeature = (...features: (FeatureKey | string)[]): boolean => {
            if (isCustom) return true;
            return features.some((f) => isFeatureEnabled(f));
        };

        // Check multiple features (ALL)
        const hasAllFeatures = (...features: (FeatureKey | string)[]): boolean => {
            if (isCustom) return true;
            return features.every((f) => isFeatureEnabled(f));
        };

        // Pre-computed common feature checks for convenience
        const commonFeatures = {
            // F&B Features
            hasKitchenDisplay: isEnabled(FEATURES.KITCHEN_DISPLAY),
            hasTableManagement: isEnabled(FEATURES.TABLE_MANAGEMENT),
            hasOrderManagement: isEnabled(FEATURES.ORDER_MANAGEMENT),
            hasWaitingList: isEnabled(FEATURES.WAITING_LIST),
            hasModifiers: isEnabled(FEATURES.MODIFIERS),
            hasSelfOrderQR: isEnabled(FEATURES.SELF_ORDER_QR),
            hasOrderTypes: isEnabled(FEATURES.ORDER_TYPES),
            hasPriceEditing: isEnabled(FEATURES.POS_PRICE_EDITING),
            hasCreditSales: isEnabled(FEATURES.CREDIT_SALES),
            hasDecimalQuantities: isEnabled(FEATURES.DECIMAL_QUANTITIES),
            hasIngredientTracking: isEnabled(FEATURES.INGREDIENT_TRACKING),

            // Retail Features
            hasBarcodeScanning: isEnabled(FEATURES.BARCODE_SCANNING),
            hasStockManagement: isEnabled(FEATURES.STOCK_MANAGEMENT),
            hasStockTransfer: isEnabled(FEATURES.STOCK_TRANSFER),
            hasSupplierManagement: isEnabled(FEATURES.SUPPLIER_MANAGEMENT),
            hasPurchaseOrders: isEnabled(FEATURES.PURCHASE_ORDERS),
            hasProductVariants: isEnabled(FEATURES.PRODUCT_VARIANTS),
            hasUnitConversion: isEnabled(FEATURES.UNIT_CONVERSION),
            hasSerialNumber: isEnabled(FEATURES.SERIAL_NUMBER),
            hasBatchTracking: isEnabled(FEATURES.BATCH_TRACKING),
            hasPriceTiers: isEnabled(FEATURES.PRICE_TIERS),

            // Service Features
            hasAppointments: isEnabled(FEATURES.APPOINTMENTS),
            hasStaffAssignment: isEnabled(FEATURES.STAFF_ASSIGNMENT),
            hasStaffCommission: isEnabled(FEATURES.STAFF_COMMISSION),
            hasServiceDuration: isEnabled(FEATURES.SERVICE_DURATION),
            hasWorkOrders: isEnabled(FEATURES.WORK_ORDERS),
            hasItemTracking: isEnabled(FEATURES.ITEM_TRACKING),

            // Marketing Features
            hasCustomerLoyalty: isEnabled(FEATURES.CUSTOMER_LOYALTY),
            hasPromotions: isEnabled(FEATURES.PROMOTIONS),
            hasVouchers: isEnabled(FEATURES.VOUCHERS),
            hasCustomerSegments: isEnabled(FEATURES.CUSTOMER_SEGMENTS),
            hasOnlineStore: isEnabled(FEATURES.ONLINE_STORE),

            // Advanced Features
            hasMultiOutlet: isEnabled(FEATURES.MULTI_OUTLET),
            hasMultiWarehouse: isEnabled(FEATURES.MULTI_WAREHOUSE),
            hasAdvancedReports: isEnabled(FEATURES.REPORTS_ADVANCED),
            hasAuditLog: isEnabled(FEATURES.AUDIT_LOG),
            hasApiIntegration: isEnabled(FEATURES.API_INTEGRATION),
            hasOfflineMode: isEnabled(FEATURES.OFFLINE_MODE),
            hasExcelImport: isEnabled(FEATURES.EXCEL_IMPORT),
        };

        return {
            // State
            enabledFeatures,
            businessType: activeType,
            outletType,
            isLoaded,
            category: getCategory(),

            // Business/outlet type checks
            isFnB,
            isRetail,
            isService,
            isWholesale,
            isCustom,

            // Feature check functions
            isEnabled,
            hasAnyFeature,
            hasAllFeatures,

            // Pre-computed common features
            ...commonFeatures,
        };
    }, [enabledFeatures, businessType, outletType, isLoaded, isFeatureEnabled]);
}

/**
 * useBusinessType - Simple hook to get current business type info
 */
export function useBusinessType() {
    const businessType = useFeatureStore((s) => s.businessType);
    const outletType = useFeatureStore((s) => s.outletType);

    return useMemo(() => {
        const activeType = outletType || businessType;
        if (!activeType) return null;

        const isFnB = activeType.startsWith('fnb_');
        const isRetail = activeType.startsWith('retail_');
        const isService = activeType.startsWith('service_');
        const isWholesale = activeType === 'wholesale';
        const isCustom = activeType === 'custom';

        let category: BusinessCategory | null = null;
        if (isFnB) category = 'fnb';
        else if (isRetail) category = 'retail';
        else if (isService) category = 'service';
        else if (isWholesale) category = 'wholesale';
        else if (isCustom) category = 'custom';

        return {
            code: activeType,
            category,
            isFnB,
            isRetail,
            isService,
            isWholesale,
            isCustom,
        };
    }, [businessType, outletType]);
}
