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
    const productsQuery = useQuery({
        queryKey: ['pos', 'products', outletId],
        queryFn: () => posApi.getProducts(outletId),
        enabled: !!outletId,
    });

    const categoriesQuery = useQuery({
        queryKey: ['pos', 'categories', outletId],
        queryFn: () => posApi.getCategories(outletId),
        enabled: !!outletId,
    });

    const bundlesQuery = useQuery({
        queryKey: ['pos', 'bundles', outletId],
        queryFn: () => bundlePackagesApi.getForPOS(outletId),
        enabled: !!outletId,
    });

    const isLoading = productsQuery.isLoading || categoriesQuery.isLoading || bundlesQuery.isLoading;
    // Products are essential; categories/bundles failing also means an incomplete catalog.
    const isError = productsQuery.isError || categoriesQuery.isError || bundlesQuery.isError;
    const error = productsQuery.error ?? categoriesQuery.error ?? bundlesQuery.error;

    const refetchAll = () =>
        Promise.all([productsQuery.refetch(), categoriesQuery.refetch(), bundlesQuery.refetch()]);

    return {
        products: productsQuery.data ?? [],
        categories: categoriesQuery.data ?? [],
        bundles: bundlesQuery.data ?? [],
        isLoading,
        isError,
        error,
        refetchProducts: productsQuery.refetch,
        refetchAll,
    };
}
