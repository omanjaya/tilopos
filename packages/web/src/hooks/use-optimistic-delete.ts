import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import type { PaginatedResponse } from '@/types/api.types';

interface UseOptimisticDeleteOptions {
  /** Query key prefix to match (e.g., ['products']) */
  queryKey: unknown[];
  /** API delete function */
  deleteFn: (id: string) => Promise<unknown>;
  /** Success toast title */
  successMessage?: string;
  /** Error toast context title */
  errorMessage?: string;
  /** Called after successful delete */
  onSuccess?: () => void;
}

/**
 * Hook for optimistic delete operations on paginated lists.
 *
 * Immediately removes the item from the UI, then confirms with server.
 * Rolls back if the server rejects the delete.
 *
 * Works with both paginated (`PaginatedResponse<T>`) and array cache shapes.
 */
export function useOptimisticDelete({
  queryKey,
  deleteFn,
  successMessage = 'Data berhasil dihapus',
  errorMessage = 'Gagal menghapus data',
  onSuccess,
}: UseOptimisticDeleteOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFn,

    onMutate: async (id: string) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot all matching queries for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey });

      // Optimistically remove the item from all matching cached queries
      queryClient.setQueriesData({ queryKey }, (old: unknown) => {
        if (!old) return old;

        // PaginatedResponse shape
        if (typeof old === 'object' && 'data' in (old as Record<string, unknown>)) {
          const paginated = old as PaginatedResponse<{ id: string }>;
          return {
            ...paginated,
            data: paginated.data.filter((item) => item.id !== id),
            total: paginated.total - 1,
          };
        }

        // Plain array shape
        if (Array.isArray(old)) {
          return old.filter((item: { id: string }) => item.id !== id);
        }

        return old;
      });

      return { previousQueries };
    },

    onSuccess: () => {
      toast.success({ title: successMessage });
      onSuccess?.();
    },

    onError: (error, _id, context) => {
      // Rollback all queries to their previous state
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      handleMutationError(error, errorMessage);
    },

    onSettled: () => {
      // Refetch to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
