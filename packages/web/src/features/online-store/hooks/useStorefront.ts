import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { onlineStoreApi } from '@/api/endpoints/online-store.api';

function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

/**
 * Hook to fetch storefront data
 */
export function useStorefront(slug: string) {
  const { data: storefront, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['online-store-storefront', slug],
    queryFn: () => onlineStoreApi.getStorefront(slug),
    enabled: !!slug,
    retry: (failureCount, err) => !isNotFoundError(err) && failureCount < 2,
  });

  return {
    storefront,
    products: storefront?.products ?? [],
    categories: storefront?.categories ?? [],
    isLoading,
    isError,
    isNotFound: !slug || (isError && isNotFoundError(error)),
    error,
    refetch,
  };
}
