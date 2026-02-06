import { useQuery } from '@tanstack/react-query';
import { onlineStoreApi } from '@/api/endpoints/online-store.api';

/**
 * Hook to fetch storefront data
 */
export function useStorefront(slug: string) {
  const { data: storefront, isLoading, error } = useQuery({
    queryKey: ['online-store-storefront', slug],
    queryFn: () => onlineStoreApi.getStorefront(slug),
    enabled: !!slug,
  });

  const products = storefront?.products || [];
  const storeCategories = storefront?.categories || [];

  // Get unique categories with IDs (add slug for "all" category)
  const categories = [
    { id: 'all', name: 'Semua', slug: 'all' },
    ...storeCategories,
  ];

  return {
    storefront,
    products,
    categories,
    isLoading,
    error,
  };
}
