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
    const isFeatureRestricted = useFeatureStore((s) => s.isFeatureRestricted);
    const isLoaded = useFeatureStore((s) => s.isLoaded);
    const businessType = useFeatureStore((s) => s.businessType);

    if (!isLoaded) {
        return { isEnabled: true, isLoaded: false };
    }

    const features = Array.isArray(feature) ? feature : [feature];

    // For custom business type, bypass business-type feature filtering
    // but still enforce subscription restrictions
    if (businessType === 'custom') {
        const hasRestricted = requireAll
            ? features.some((f) => isFeatureRestricted(f))
            : features.every((f) => isFeatureRestricted(f));

        return { isEnabled: !hasRestricted, isLoaded: true };
    }

    const isEnabled = requireAll
        ? features.every((f) => isFeatureEnabled(f))
        : features.some((f) => isFeatureEnabled(f));

    return { isEnabled, isLoaded };
}
