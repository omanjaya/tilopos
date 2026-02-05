import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * useDeleteHandler Hook
 *
 * Generic hook for delete confirmation and handling:
 * - Manages confirmation dialog state
 * - Handles delete mutation
 * - Success/error callbacks
 * - Type-safe
 *
 * Provides consistent delete UX across all pages.
 *
 * Usage:
 * ```tsx
 * const {
 *   deleteTarget,
 *   setDeleteTarget,
 *   isDeleting,
 *   handleDelete,
 *   handleCancelDelete,
 * } = useDeleteHandler({
 *   deleteFn: (id) => productsApi.delete(id),
 *   invalidateQueries: ['products'],
 *   onSuccess: () => {
 *     toast({ title: 'Product deleted successfully' });
 *   },
 *   onError: (error) => {
 *     toast({
 *       variant: 'destructive',
 *       title: 'Failed to delete product',
 *       description: error.response?.data?.message,
 *     });
 *   },
 * });
 *
 * // In component JSX:
 * <ConfirmDialog
 *   open={!!deleteTarget}
 *   onOpenChange={(open) => !open && handleCancelDelete()}
 *   onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
 *   title="Delete Product"
 *   description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
 *   loading={isDeleting}
 * />
 * ```
 */

export interface UseDeleteHandlerOptions<TError = AxiosError<ApiErrorResponse>> {
  /** Function to delete an item */
  deleteFn: (id: string) => Promise<void>;
  /** Query keys to invalidate after successful delete */
  invalidateQueries?: unknown[];
  /** Callback when delete succeeds */
  onSuccess?: () => void;
  /** Callback when delete fails */
  onError?: (error: TError) => void;
}

export interface UseDeleteHandlerResult<TItem, TError = AxiosError<ApiErrorResponse>> {
  /** Item marked for deletion (null if no confirmation pending) */
  deleteTarget: TItem | null;
  /** Set item to delete (opens confirmation) */
  setDeleteTarget: (item: TItem | null) => void;
  /** Whether delete is in progress */
  isDeleting: boolean;
  /** Execute delete operation */
  handleDelete: (id: string) => void;
  /** Cancel delete (close confirmation) */
  handleCancelDelete: () => void;
  /** Delete mutation object */
  deleteMutation: {
    isPending: boolean;
    isError: boolean;
    error: TError | null;
  };
}

export function useDeleteHandler<TItem = { id: string; name?: string }, TError = AxiosError<ApiErrorResponse>>({
  deleteFn,
  invalidateQueries,
  onSuccess,
  onError,
}: UseDeleteHandlerOptions<TError>): UseDeleteHandlerResult<TItem, TError> {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<TItem | null>(null);

  // Delete mutation
  const deleteMutation = useMutation<void, TError, string>({
    mutationFn: deleteFn,
    onSuccess: () => {
      // Invalidate related queries
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
        });
      }

      // Close confirmation dialog
      setDeleteTarget(null);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error);
      }
    },
  });

  // Execute delete
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  return {
    deleteTarget,
    setDeleteTarget,
    isDeleting: deleteMutation.isPending,
    handleDelete,
    handleCancelDelete,
    deleteMutation: {
      isPending: deleteMutation.isPending,
      isError: deleteMutation.isError,
      error: deleteMutation.error,
    },
  };
}

/**
 * Example Usage in a List Page:
 *
 * ```tsx
 * import { useDeleteHandler } from '@/hooks/use-delete-handler';
 * import { productsApi } from '@/api/endpoints/products.api';
 * import { useToast } from '@/hooks/use-toast';
 * import { ConfirmDialog } from '@/components/shared/confirm-dialog';
 *
 * export function ProductsPage() {
 *   const { toast } = useToast();
 *
 *   const {
 *     deleteTarget,
 *     setDeleteTarget,
 *     isDeleting,
 *     handleDelete,
 *     handleCancelDelete,
 *   } = useDeleteHandler({
 *     deleteFn: (id) => productsApi.delete(id),
 *     invalidateQueries: ['products'],
 *     onSuccess: () => {
 *       toast({ title: 'Product deleted successfully' });
 *     },
 *     onError: (error) => {
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to delete product',
 *         description: error.response?.data?.message || 'An error occurred',
 *       });
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <DataTable
 *         data={products}
 *         onDelete={(product) => setDeleteTarget(product)}
 *       />
 *
 *       <ConfirmDialog
 *         open={!!deleteTarget}
 *         onOpenChange={(open) => !open && handleCancelDelete()}
 *         onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
 *         title="Delete Product"
 *         description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
 *         confirmText="Delete"
 *         loading={isDeleting}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * This replaces ~30-40 lines of boilerplate code per page!
 */
