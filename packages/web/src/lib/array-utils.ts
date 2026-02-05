/**
 * Array Utilities
 *
 * Safe array operations that handle null/undefined and edge cases.
 */

/**
 * Safely access array item by index
 *
 * Returns undefined instead of throwing if index is out of bounds.
 *
 * @param array - Array to access
 * @param index - Index to access
 * @returns Item at index or undefined
 *
 * @example
 * ```tsx
 * const first = safeArrayAccess(items, 0); // undefined if empty
 * const last = safeArrayAccess(items, -1); // last item or undefined
 * ```
 */
export function safeArrayAccess<T>(
  array: T[] | null | undefined,
  index: number
): T | undefined {
  if (!array || array.length === 0) return undefined;

  // Handle negative index (from end)
  if (index < 0) {
    index = array.length + index;
  }

  // Check bounds
  if (index < 0 || index >= array.length) return undefined;

  return array[index];
}

/**
 * Get first item from array safely
 *
 * @param array - Array to access
 * @returns First item or undefined
 */
export function firstItem<T>(array: T[] | null | undefined): T | undefined {
  return safeArrayAccess(array, 0);
}

/**
 * Get last item from array safely
 *
 * @param array - Array to access
 * @returns Last item or undefined
 */
export function lastItem<T>(array: T[] | null | undefined): T | undefined {
  return safeArrayAccess(array, -1);
}

/**
 * Check if array is empty or null/undefined
 *
 * @param array - Array to check
 * @returns True if array is empty or null/undefined
 *
 * @example
 * ```tsx
 * if (isEmptyArray(products)) {
 *   return <EmptyState />;
 * }
 * ```
 */
export function isEmptyArray<T>(array: T[] | null | undefined): boolean {
  return !array || array.length === 0;
}

/**
 * Filter out null/undefined values from array
 *
 * @param array - Array to filter
 * @returns Filtered array with non-null values
 *
 * @example
 * ```tsx
 * const valid = filterNullish([1, null, 2, undefined, 3]); // [1, 2, 3]
 * ```
 */
export function filterNullish<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item !== null && item !== undefined);
}

/**
 * Sum array values safely
 *
 * Handles null/undefined/NaN values by treating them as 0.
 *
 * @param array - Array of numbers
 * @param selector - Optional function to extract number from object
 * @returns Sum of all values
 *
 * @example
 * ```tsx
 * const total = sumArray([1, 2, 3]); // 6
 * const totalPrice = sumArray(items, item => item.price);
 * const safeTotal = sumArray([1, null, NaN, 3]); // 4
 * ```
 */
export function sumArray<T>(
  array: T[] | null | undefined,
  selector?: (item: T) => number | null | undefined
): number {
  if (isEmptyArray(array)) return 0;

  return array!.reduce((sum, item) => {
    const value = selector ? selector(item) : (item as unknown as number);
    const numValue = value ?? 0;
    return sum + (isFinite(numValue) ? numValue : 0);
  }, 0);
}

/**
 * Calculate average of array values safely
 *
 * Handles empty arrays and null/undefined values.
 *
 * @param array - Array of numbers
 * @param selector - Optional function to extract number from object
 * @returns Average value or 0 if empty
 *
 * @example
 * ```tsx
 * const avg = averageArray([1, 2, 3]); // 2
 * const avgPrice = averageArray(items, item => item.price);
 * const empty = averageArray([]); // 0
 * ```
 */
export function averageArray<T>(
  array: T[] | null | undefined,
  selector?: (item: T) => number | null | undefined
): number {
  if (isEmptyArray(array)) return 0;

  const sum = sumArray(array, selector);
  return sum / array!.length;
}

/**
 * Find max value in array safely
 *
 * @param array - Array of numbers
 * @param selector - Optional function to extract number from object
 * @returns Max value or 0 if empty
 *
 * @example
 * ```tsx
 * const max = maxArray([1, 5, 3]); // 5
 * const maxPrice = maxArray(items, item => item.price);
 * ```
 */
export function maxArray<T>(
  array: T[] | null | undefined,
  selector?: (item: T) => number | null | undefined
): number {
  if (isEmptyArray(array)) return 0;

  const values = array!.map((item) => {
    const value = selector ? selector(item) : (item as unknown as number);
    return value ?? 0;
  });

  return Math.max(...values.filter(isFinite));
}

/**
 * Find min value in array safely
 *
 * @param array - Array of numbers
 * @param selector - Optional function to extract number from object
 * @returns Min value or 0 if empty
 */
export function minArray<T>(
  array: T[] | null | undefined,
  selector?: (item: T) => number | null | undefined
): number {
  if (isEmptyArray(array)) return 0;

  const values = array!.map((item) => {
    const value = selector ? selector(item) : (item as unknown as number);
    return value ?? 0;
  });

  return Math.min(...values.filter(isFinite));
}

/**
 * Group array by key
 *
 * @param array - Array to group
 * @param keySelector - Function to extract grouping key
 * @returns Object with grouped arrays
 *
 * @example
 * ```tsx
 * const byCategory = groupBy(products, p => p.categoryId);
 * // { "cat1": [...], "cat2": [...] }
 * ```
 */
export function groupBy<T>(
  array: T[] | null | undefined,
  keySelector: (item: T) => string | number
): Record<string, T[]> {
  if (isEmptyArray(array)) return {};

  return array!.reduce((groups, item) => {
    const key = String(keySelector(item));
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Chunk array into smaller arrays of specified size
 *
 * @param array - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 *
 * @example
 * ```tsx
 * const chunks = chunkArray([1, 2, 3, 4, 5], 2);
 * // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunkArray<T>(array: T[] | null | undefined, size: number): T[][] {
  if (isEmptyArray(array) || size <= 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < array!.length; i += size) {
    chunks.push(array!.slice(i, i + size));
  }
  return chunks;
}
