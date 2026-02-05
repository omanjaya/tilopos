import { useEffect, useState } from 'react';

/**
 * Hook to debounce a value
 *
 * Delays updating the returned value until the input value has stopped changing
 * for the specified delay. Useful for search inputs and other expensive operations.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 300);
 *
 * // API call only happens after user stops typing for 300ms
 * const { data } = useQuery({
 *   queryKey: ['products', debouncedSearch],
 *   queryFn: () => productsApi.search(debouncedSearch),
 * });
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
