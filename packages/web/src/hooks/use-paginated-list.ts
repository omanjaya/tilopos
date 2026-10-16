import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse, PaginationParams } from '@/types/api.types';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export interface SortState {
  sortBy: string | undefined;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}

interface UsePaginatedListOptions<
  T,
  TFilters = Record<string, unknown>,
  TResponse extends PaginatedResponse<T> = PaginatedResponse<T>,
> {
  /** Query key prefix (e.g., ['products']) */
  queryKey: unknown[];
  /** Fetch function that accepts pagination params */
  queryFn: (params: PaginationParams & TFilters) => Promise<TResponse>;
  /** Additional filters to pass to queryFn */
  filters?: TFilters;
  /** Items per page (default: 10) */
  defaultLimit?: number;
  /** Enable the query (default: true) */
  enabled?: boolean;
}

interface UsePaginatedListResult<T, TResponse extends PaginatedResponse<T> = PaginatedResponse<T>> {
  /** The current page data */
  data: T[];
  /** Full response of the current page (e.g. server-side summaries) */
  response: TResponse | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error object */
  error: unknown;
  /** Refetch data */
  refetch: () => void;
  /** Pagination state to pass to DataTable/MobileTable */
  pagination: PaginationState;
  /** Sort state to pass to DataTable */
  sort: SortState;
  /** Current search query */
  search: string;
  /** Set search query (resets to page 1) */
  setSearch: (query: string) => void;
}

export function usePaginatedList<
  T,
  TFilters = Record<string, unknown>,
  TResponse extends PaginatedResponse<T> = PaginatedResponse<T>,
>({
  queryKey,
  queryFn,
  filters,
  defaultLimit = 10,
  enabled = true,
}: UsePaginatedListOptions<T, TFilters, TResponse>): UsePaginatedListResult<T, TResponse> {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [search, setSearchState] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  const params = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      sortBy,
      sortOrder: sortBy ? sortOrder : undefined,
      ...filters,
    }) as PaginationParams & TFilters,
    [page, limit, search, sortBy, sortOrder, filters],
  );

  const fullQueryKey = useMemo(
    () => [...queryKey, { page, limit, search, sortBy, sortOrder, ...filters }],
    [queryKey, page, limit, search, sortBy, sortOrder, filters],
  );

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: fullQueryKey,
    queryFn: () => queryFn(params),
    enabled,
    placeholderData: (previousData) => previousData,
  });

  const setSearch = useCallback((query: string) => {
    setSearchState(query);
    setPage(1);
  }, []);

  const onPageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const onLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const onSort = useCallback((key: string) => {
    // asc -> desc -> no sort (pure computation, no nested state setters)
    if (sortBy !== key) {
      setSortBy(key);
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortBy(undefined);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy, sortOrder]);

  // Prefetch next page (side effect, so not during render)
  const totalPages = response?.totalPages ?? 0;
  useEffect(() => {
    if (page >= totalPages) return;
    const nextParams = { ...params, page: page + 1 };
    const nextQueryKey = [...queryKey, { page: page + 1, limit, search, sortBy, sortOrder, ...filters }];
    void queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => queryFn(nextParams),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params/queryKey/filters are rebuilt each render; the listed values determine the next page
  }, [page, totalPages, limit, search, sortBy, sortOrder, queryClient]);

  const pagination: PaginationState = {
    page,
    limit,
    total: response?.total ?? 0,
    totalPages,
    onPageChange,
    onLimitChange,
  };

  const sort: SortState = {
    sortBy,
    sortOrder,
    onSort,
  };

  return {
    data: response?.data ?? [],
    response,
    isLoading,
    error,
    refetch,
    pagination,
    sort,
    search,
    setSearch,
  };
}
