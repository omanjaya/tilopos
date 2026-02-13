import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/api/endpoints/pos.api';
import { bundlePackagesApi } from '@/api/endpoints/bundle-packages.api';

interface UsePosDataProps {
    outletId: string;
}

/**
 * Hook for fetching POS data (products, categories, and bundles)
 */
export function usePosData({ outletId }: UsePosDataProps) {
    // Fetch products
    const {
        data: products = [],
        isLoading: productsLoading,
        refetch: refetchProducts,
    } = useQuery({
        queryKey: ['pos', 'products', outletId],
        queryFn: () => posApi.getProducts(outletId),
        enabled: !!outletId,
    });

    // Fetch categories
    const {
        data: categories = [],
        isLoading: categoriesLoading,
    } = useQuery({
        queryKey: ['pos', 'categories', outletId],
        queryFn: () => posApi.getCategories(outletId),
        enabled: !!outletId,
    });

    // Fetch bundles
    const {
        data: bundles = [],
        isLoading: bundlesLoading,
    } = useQuery({
        queryKey: ['pos', 'bundles', outletId],
        queryFn: () => bundlePackagesApi.getForPOS(outletId),
        enabled: !!outletId,
    });

    const isLoading = productsLoading || categoriesLoading || bundlesLoading;

    return {
        products,
        categories,
        bundles,
        isLoading,
        refetchProducts,
    };
}
