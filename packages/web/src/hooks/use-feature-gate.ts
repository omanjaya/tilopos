import { useFeatureStore } from '@/stores/feature.store';

/**
 * useFeatureGate - Hook for checking feature enablement
 * 
 * Use this hook for conditional logic (not rendering).
 * For conditional rendering, use the FeatureGate component instead.
 * 
 * @example
 * const { isEnabled, isLoaded } = useFeatureGate('barcode_scanning');
 * 
 * if (isEnabled) {
 *   // Add barcode to payload
 * }
 * 
 * @example
 * // Multiple features (any)
 * const { isEnabled } = useFeatureGate(['modifiers', 'product_variants']);
 * 
 * @example
 * // Multiple features (all required)
 * const { isEnabled } = useFeatureGate(['stock_management', 'multi_outlet'], true);
 */
export function useFeatureGate(feature: string | string[], requireAll = false) {
    const isFeatureEnabled = useFeatureStore((s) => s.isFeatureEnabled);
    const isLoaded = useFeatureStore((s) => s.isLoaded);
    const businessType = useFeatureStore((s) => s.businessType);

    // For custom business type, all features are considered enabled
    if (businessType === 'custom') {
        return { isEnabled: true, isLoaded: true };
    }

    if (!isLoaded) {
        return { isEnabled: true, isLoaded: false };
    }

    const features = Array.isArray(feature) ? feature : [feature];

    const isEnabled = requireAll
        ? features.every((f) => isFeatureEnabled(f))
        : features.some((f) => isFeatureEnabled(f));

    return { isEnabled, isLoaded };
}
