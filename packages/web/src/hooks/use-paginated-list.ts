import { useState, useCallback, useMemo } from 'react';
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

interface UsePaginatedListOptions<T, TFilters = Record<string, unknown>> {
  /** Query key prefix (e.g., ['products']) */
  queryKey: unknown[];
  /** Fetch function that accepts pagination params */
  queryFn: (params: PaginationParams & TFilters) => Promise<PaginatedResponse<T>>;
  /** Additional filters to pass to queryFn */
  filters?: TFilters;
  /** Items per page (default: 10) */
  defaultLimit?: number;
  /** Enable the query (default: true) */
  enabled?: boolean;
}

interface UsePaginatedListResult<T> {
  /** The current page data */
  data: T[];
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

export function usePaginatedList<T, TFilters = Record<string, unknown>>({
  queryKey,
  queryFn,
  filters,
  defaultLimit = 10,
  enabled = true,
}: UsePaginatedListOptions<T, TFilters>): UsePaginatedListResult<T> {
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
    setSortBy((prevSortBy) => {
      if (prevSortBy === key) {
        // Toggle order, or clear sort on third click
        setSortOrder((prevOrder) => {
          if (prevOrder === 'asc') return 'desc';
          // Reset sort
          setSortBy(undefined);
          return 'asc';
        });
        return key;
      }
      // New column: start ascending
      setSortOrder('asc');
      return key;
    });
    setPage(1);
  }, []);

  // Prefetch next page
  const totalPages = response?.totalPages ?? 0;
  if (page < totalPages) {
    const nextParams = { ...params, page: page + 1 };
    const nextQueryKey = [...queryKey, { page: page + 1, limit, search, sortBy, sortOrder, ...filters }];
    queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => queryFn(nextParams),
    });
  }

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
    isLoading,
    error,
    refetch,
    pagination,
    sort,
    search,
    setSearch,
  };
}
