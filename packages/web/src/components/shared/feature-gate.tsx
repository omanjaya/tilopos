import { type ReactNode } from 'react';
import { useFeatureStore } from '@/stores/feature.store';

// Re-export from feature-keys for convenience
export { FEATURES, type FeatureKey } from '@/lib/feature-keys';

interface FeatureGateProps {
    /** Single feature key or array of feature keys */
    feature: string | string[];
    /** If true, requires ALL features to be enabled. If false, requires ANY feature (default: false) */
    requireAll?: boolean;
    /** Content to show when feature is enabled */
    children: ReactNode;
    /** Optional fallback content when feature is disabled */
    fallback?: ReactNode;
}

/**
 * FeatureGate - Conditionally renders children based on enabled features
 * 
 * @example
 * // Single feature
 * <FeatureGate feature="table_management">
 *   <TableSelector />
 * </FeatureGate>
 * 
 * @example
 * // Multiple features - show if ANY is enabled
 * <FeatureGate feature={['modifiers', 'product_variants']}>
 *   <OptionsPanel />
 * </FeatureGate>
 * 
 * @example
 * // Multiple features - require ALL
 * <FeatureGate feature={['stock_management', 'multi_outlet']} requireAll>
 *   <StockTransferPanel />
 * </FeatureGate>
 * 
 * @example
 * // With fallback
 * <FeatureGate feature="appointments" fallback={<BasicView />}>
 *   <AppointmentCalendar />
 * </FeatureGate>
 */
export function FeatureGate({
    feature,
    requireAll = false,
    children,
    fallback = null
}: FeatureGateProps) {
    const isFeatureEnabled = useFeatureStore((s) => s.isFeatureEnabled);
    const isLoaded = useFeatureStore((s) => s.isLoaded);
    const businessType = useFeatureStore((s) => s.businessType);

    // For custom business type, show all features (user can configure manually)
    if (businessType === 'custom') {
        return <>{children}</>;
    }

    // If features haven't loaded yet, show children (graceful degradation)
    if (!isLoaded) {
        return <>{children}</>;
    }

    const features = Array.isArray(feature) ? feature : [feature];

    const isEnabled = requireAll
        ? features.every((f) => isFeatureEnabled(f))
        : features.some((f) => isFeatureEnabled(f));

    return isEnabled ? <>{children}</> : <>{fallback}</>;
}
