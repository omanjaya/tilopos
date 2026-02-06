import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/api/endpoints/pos.api';

interface UsePosDataProps {
    outletId: string;
}

/**
 * Hook for fetching POS data (products and categories)
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

    const isLoading = productsLoading || categoriesLoading;

    return {
        products,
        categories,
        isLoading,
        refetchProducts,
    };
}
