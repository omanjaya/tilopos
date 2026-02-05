import type { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query Utilities
 *
 * Helper functions for common query patterns including optimistic updates
 * with automatic rollback on error.
 */

/**
 * Configuration for optimistic update
 */
interface OptimisticUpdateConfig<TData, TVariables> {
  queryKey: unknown[];
  queryClient: QueryClient;
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
}

/**
 * Setup optimistic update with automatic rollback
 *
 * Returns onMutate and onError handlers for useMutation.
 * Automatically cancels in-flight queries and rolls back on error.
 *
 * @param config - Configuration object
 * @returns Object with onMutate and onError handlers
 *
 * @example
 * ```tsx
 * const { onMutate, onError } = setupOptimisticUpdate({
 *   queryKey: ['todos'],
 *   queryClient,
 *   updateFn: (oldTodos, newTodo) => [...(oldTodos || []), newTodo],
 * });
 *
 * const mutation = useMutation({
 *   mutationFn: createTodo,
 *   onMutate,
 *   onError,
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['todos'] });
 *   },
 * });
 * ```
 */
export function setupOptimisticUpdate<TData, TVariables>({
  queryKey,
  queryClient,
  updateFn,
}: OptimisticUpdateConfig<TData, TVariables>) {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot current value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      if (previousData !== undefined) {
        queryClient.setQueryData<TData>(queryKey, updateFn(previousData, variables));
      }

      // Return context with previous data
      return { previousData };
    },

    onError: (
      _error: unknown,
      _variables: TVariables,
      context: { previousData?: TData } | undefined
    ) => {
      // Rollback to previous data on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData<TData>(queryKey, context.previousData);
      }
    },
  };
}

/**
 * Setup optimistic update for array-based data (lists)
 *
 * Provides common patterns for list operations: add, update, delete.
 *
 * @param queryKey - Query key for the list
 * @param queryClient - Query client instance
 * @returns Object with handlers for add, update, delete operations
 *
 * @example
 * ```tsx
 * const optimistic = setupOptimisticListUpdate<Product>(['products'], queryClient);
 *
 * const createMutation = useMutation({
 *   mutationFn: productsApi.create,
 *   ...optimistic.add((products, newProduct) => [...products, newProduct]),
 * });
 *
 * const updateMutation = useMutation({
 *   mutationFn: productsApi.update,
 *   ...optimistic.update((products, updated) =>
 *     products.map(p => p.id === updated.id ? updated : p)
 *   ),
 * });
 *
 * const deleteMutation = useMutation({
 *   mutationFn: productsApi.delete,
 *   ...optimistic.delete((products, id) =>
 *     products.filter(p => p.id !== id)
 *   ),
 * });
 * ```
 */
export function setupOptimisticListUpdate<TItem>(
  queryKey: unknown[],
  queryClient: QueryClient
) {
  return {
    add: (updateFn: (items: TItem[], newItem: TItem) => TItem[]) =>
      setupOptimisticUpdate<TItem[], TItem>({
        queryKey,
        queryClient,
        updateFn: (oldItems = [], newItem) => updateFn(oldItems, newItem),
      }),

    update: (updateFn: (items: TItem[], updated: TItem) => TItem[]) =>
      setupOptimisticUpdate<TItem[], TItem>({
        queryKey,
        queryClient,
        updateFn: (oldItems = [], updated) => updateFn(oldItems, updated),
      }),

    delete: (updateFn: (items: TItem[], id: string) => TItem[]) =>
      setupOptimisticUpdate<TItem[], string>({
        queryKey,
        queryClient,
        updateFn: (oldItems = [], id) => updateFn(oldItems, id),
      }),
  };
}

/**
 * Invalidate multiple related queries at once
 *
 * Useful when a mutation affects multiple query keys.
 *
 * @param queryClient - Query client instance
 * @param queryKeys - Array of query keys to invalidate
 *
 * @example
 * ```tsx
 * const mutation = useMutation({
 *   mutationFn: updateProduct,
 *   onSuccess: () => {
 *     invalidateQueries(queryClient, [
 *       ['products'],
 *       ['categories'],
 *       ['inventory'],
 *     ]);
 *   },
 * });
 * ```
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  queryKeys: unknown[][]
): Promise<void> {
  await Promise.all(
    queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
  );
}

/**
 * Refetch multiple queries at once
 *
 * @param queryClient - Query client instance
 * @param queryKeys - Array of query keys to refetch
 */
export async function refetchQueries(
  queryClient: QueryClient,
  queryKeys: unknown[][]
): Promise<void> {
  await Promise.all(
    queryKeys.map((key) => queryClient.refetchQueries({ queryKey: key }))
  );
}

/**
 * Check if any queries are loading
 *
 * Useful for showing a global loading indicator.
 *
 * @param queryClient - Query client instance
 * @param queryKeys - Array of query keys to check (optional, checks all if not provided)
 * @returns True if any queries are loading
 *
 * @example
 * ```tsx
 * const isLoading = isAnyQueryLoading(queryClient, [
 *   ['products'],
 *   ['categories'],
 * ]);
 * ```
 */
export function isAnyQueryLoading(
  queryClient: QueryClient,
  queryKeys?: unknown[][]
): boolean {
  if (!queryKeys) {
    return queryClient.isFetching() > 0;
  }

  return queryKeys.some((key) =>
    queryClient.isFetching({ queryKey: key }) > 0
  );
}
