import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * useListItems Hook
 *
 * Generic hook for list pages that handles:
 * - Data fetching with caching
 * - Delete mutations
 * - Loading/error states
 * - Refetch functionality
 * - Type-safe
 *
 * Eliminates duplication across 10+ list pages.
 *
 * Usage:
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   error,
 *   refetch,
 *   deleteMutation,
 *   handleDelete,
 * } = useListItems({
 *   queryKey: ['products', filters],
 *   queryFn: () => productsApi.list(filters),
 *   deleteFn: (id) => productsApi.delete(id),
 *   onDeleteSuccess: () => {
 *     toast({ title: 'Product deleted successfully' });
 *   },
 *   onDeleteError: (error) => {
 *     toast({
 *       variant: 'destructive',
 *       title: 'Failed to delete product',
 *       description: error.response?.data?.message,
 *     });
 *   },
 * });
 * ```
 */

export interface UseListItemsOptions<TData, TError = AxiosError<ApiErrorResponse>> {
  /** Query key for caching */
  queryKey: unknown[];
  /** Function to fetch list data */
  queryFn: () => Promise<TData>;
  /** Function to delete an item (optional) */
  deleteFn?: (id: string) => Promise<void>;
  /** Callback when delete succeeds */
  onDeleteSuccess?: () => void;
  /** Callback when delete fails */
  onDeleteError?: (error: TError) => void;
  /** Enable query (default: true) */
  enabled?: boolean;
  /** Additional query options */
  queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn' | 'enabled'>;
}

export interface UseListItemsResult<TData, TError = AxiosError<ApiErrorResponse>> {
  /** List data */
  data: TData | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error object if fetch failed */
  error: TError | null;
  /** Refetch function */
  refetch: () => void;
  /** Delete mutation object */
  deleteMutation: {
    mutate: (id: string) => void;
    isPending: boolean;
    isError: boolean;
    error: TError | null;
  };
  /** Convenient delete handler */
  handleDelete: (id: string) => void;
}

export function useListItems<TData = unknown, TError = AxiosError<ApiErrorResponse>>({
  queryKey,
  queryFn,
  deleteFn,
  onDeleteSuccess,
  onDeleteError,
  enabled = true,
  queryOptions,
}: UseListItemsOptions<TData, TError>): UseListItemsResult<TData, TError> {
  const queryClient = useQueryClient();

  // Fetch list data
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<TData, TError>({
    queryKey,
    queryFn,
    enabled,
    ...queryOptions,
  });

  // Delete mutation
  const deleteMutation = useMutation<void, TError, string>({
    mutationFn: async (id: string) => {
      if (!deleteFn) {
        throw new Error('deleteFn is not provided');
      }
      return deleteFn(id);
    },
    onSuccess: () => {
      // Invalidate and refetch the list
      queryClient.invalidateQueries({ queryKey });
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    },
    onError: (error) => {
      if (onDeleteError) {
        onDeleteError(error);
      }
    },
  });

  // Convenient delete handler
  const handleDelete = (id: string) => {
    if (deleteFn) {
      deleteMutation.mutate(id);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    deleteMutation: {
      mutate: deleteMutation.mutate,
      isPending: deleteMutation.isPending,
      isError: deleteMutation.isError,
      error: deleteMutation.error,
    },
    handleDelete,
  };
}

/**
 * Example Usage in a List Page:
 *
 * ```tsx
 * import { useListItems } from '@/hooks/use-list-items';
 * import { productsApi } from '@/api/endpoints/products.api';
 * import { useToast } from '@/hooks/use-toast';
 *
 * export function ProductsPage() {
 *   const { toast } = useToast();
 *   const [filters, setFilters] = useState({ category: 'all' });
 *
 *   const {
 *     data: productsData,
 *     isLoading,
 *     error,
 *     refetch,
 *     deleteMutation,
 *     handleDelete,
 *   } = useListItems({
 *     queryKey: ['products', filters],
 *     queryFn: () => productsApi.list(filters),
 *     deleteFn: (id) => productsApi.delete(id),
 *     onDeleteSuccess: () => {
 *       toast({ title: 'Product deleted successfully' });
 *     },
 *     onDeleteError: (error) => {
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to delete product',
 *         description: error.response?.data?.message || 'An error occurred',
 *       });
 *     },
 *   });
 *
 *   const products = productsData?.data || [];
 *
 *   return (
 *     <div>
 *       <DataTable
 *         data={products}
 *         isLoading={isLoading}
 *         onDelete={handleDelete}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * This replaces ~50-80 lines of boilerplate code per page!
 */
