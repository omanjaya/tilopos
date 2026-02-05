import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * Error Handlers Utility Library
 *
 * Centralized error handling functions to eliminate duplication
 * across 20+ files that handle API errors.
 *
 * Benefits:
 * - Consistent error messages
 * - Type-safe error handling
 * - Easier maintenance (single source of truth)
 * - Reduces ~200-300 LOC across the app
 *
 * Usage:
 * ```tsx
 * import { handleMutationError, handleQueryError } from '@/lib/error-handlers';
 *
 * const mutation = useMutation({
 *   mutationFn: productsApi.create,
 *   onError: (error) => {
 *     toast(handleMutationError(error, 'Gagal membuat produk'));
 *   },
 * });
 * ```
 */

/**
 * Toast configuration object for error messages
 */
export interface ToastErrorConfig {
  variant: 'destructive';
  title: string;
  description?: string;
}

/**
 * Standard mutation error handler
 *
 * Extracts error message from API response and formats it for toast display.
 *
 * @param error - Axios error from mutation
 * @param defaultTitle - Fallback title if no specific message available
 * @returns Toast configuration object
 *
 * @example
 * ```tsx
 * onError: (error) => {
 *   toast(handleMutationError(error, 'Gagal menyimpan data'));
 * }
 * ```
 */
export function handleMutationError(
  error: AxiosError<ApiErrorResponse>,
  defaultTitle = 'Gagal'
): ToastErrorConfig {
  return {
    variant: 'destructive',
    title: defaultTitle,
    description: error.response?.data?.message || 'Terjadi kesalahan',
  };
}

/**
 * Query error handler (for useQuery)
 *
 * Similar to mutation error but optimized for query errors.
 *
 * @param error - Axios error from query
 * @param defaultTitle - Fallback title
 * @returns Toast configuration object
 *
 * @example
 * ```tsx
 * const { data, error } = useQuery({
 *   queryKey: ['products'],
 *   queryFn: productsApi.list,
 *   onError: (error) => {
 *     toast(handleQueryError(error, 'Gagal memuat produk'));
 *   },
 * });
 * ```
 */
export function handleQueryError(
  error: AxiosError<ApiErrorResponse>,
  defaultTitle = 'Gagal memuat data'
): ToastErrorConfig {
  return {
    variant: 'destructive',
    title: defaultTitle,
    description: error.response?.data?.message || 'Terjadi kesalahan saat memuat data',
  };
}

/**
 * Delete operation error handler
 *
 * Specialized handler for delete operations with appropriate messaging.
 *
 * @param error - Axios error from delete mutation
 * @param itemName - Name of the item being deleted (e.g., "produk", "pelanggan")
 * @returns Toast configuration object
 *
 * @example
 * ```tsx
 * const deleteMutation = useMutation({
 *   mutationFn: productsApi.delete,
 *   onError: (error) => {
 *     toast(handleDeleteError(error, 'produk'));
 *   },
 * });
 * ```
 */
export function handleDeleteError(
  error: AxiosError<ApiErrorResponse>,
  itemName = 'item'
): ToastErrorConfig {
  return {
    variant: 'destructive',
    title: `Gagal menghapus ${itemName}`,
    description: error.response?.data?.message || 'Terjadi kesalahan saat menghapus data',
  };
}

/**
 * Create operation error handler
 *
 * @param error - Axios error from create mutation
 * @param itemName - Name of the item being created
 * @returns Toast configuration object
 */
export function handleCreateError(
  error: AxiosError<ApiErrorResponse>,
  itemName = 'item'
): ToastErrorConfig {
  return {
    variant: 'destructive',
    title: `Gagal membuat ${itemName}`,
    description: error.response?.data?.message || 'Terjadi kesalahan saat membuat data',
  };
}

/**
 * Update operation error handler
 *
 * @param error - Axios error from update mutation
 * @param itemName - Name of the item being updated
 * @returns Toast configuration object
 */
export function handleUpdateError(
  error: AxiosError<ApiErrorResponse>,
  itemName = 'item'
): ToastErrorConfig {
  return {
    variant: 'destructive',
    title: `Gagal memperbarui ${itemName}`,
    description: error.response?.data?.message || 'Terjadi kesalahan saat memperbarui data',
  };
}

/**
 * Extract error message from axios error
 *
 * Utility function to get just the error message string.
 *
 * @param error - Axios error
 * @param fallback - Fallback message
 * @returns Error message string
 *
 * @example
 * ```tsx
 * const errorMessage = getErrorMessage(error, 'Unknown error occurred');
 * console.error(errorMessage);
 * ```
 */
export function getErrorMessage(
  error: AxiosError<ApiErrorResponse>,
  fallback = 'Terjadi kesalahan'
): string {
  return error.response?.data?.message || fallback;
}

/**
 * Check if error is a specific HTTP status code
 *
 * @param error - Axios error
 * @param statusCode - HTTP status code to check
 * @returns True if error matches status code
 *
 * @example
 * ```tsx
 * if (isErrorStatus(error, 404)) {
 *   // Handle not found
 * } else if (isErrorStatus(error, 403)) {
 *   // Handle forbidden
 * }
 * ```
 */
export function isErrorStatus(error: AxiosError, statusCode: number): boolean {
  return error.response?.status === statusCode;
}

/**
 * Check if error is a validation error (422)
 *
 * @param error - Axios error
 * @returns True if validation error
 */
export function isValidationError(error: AxiosError): boolean {
  return isErrorStatus(error, 422);
}

/**
 * Check if error is unauthorized (401)
 *
 * @param error - Axios error
 * @returns True if unauthorized
 */
export function isUnauthorizedError(error: AxiosError): boolean {
  return isErrorStatus(error, 401);
}

/**
 * Check if error is forbidden (403)
 *
 * @param error - Axios error
 * @returns True if forbidden
 */
export function isForbiddenError(error: AxiosError): boolean {
  return isErrorStatus(error, 403);
}

/**
 * Check if error is not found (404)
 *
 * @param error - Axios error
 * @returns True if not found
 */
export function isNotFoundError(error: AxiosError): boolean {
  return isErrorStatus(error, 404);
}

/**
 * Handle network errors (no response from server)
 *
 * @param error - Axios error
 * @returns Toast configuration or null if not network error
 */
export function handleNetworkError(
  error: AxiosError<ApiErrorResponse>
): ToastErrorConfig | null {
  if (!error.response) {
    return {
      variant: 'destructive',
      title: 'Tidak ada koneksi internet',
      description: 'Silakan periksa koneksi internet Anda dan coba lagi',
    };
  }
  return null;
}

/**
 * Comprehensive error handler that covers all common cases
 *
 * Use this when you need automatic handling of different error types.
 *
 * @param error - Axios error
 * @param context - Context of the operation (e.g., "membuat produk", "menghapus pelanggan")
 * @returns Toast configuration object
 *
 * @example
 * ```tsx
 * onError: (error) => {
 *   toast(handleApiError(error, 'menyimpan produk'));
 * }
 * ```
 */
export function handleApiError(
  error: AxiosError<ApiErrorResponse>,
  context = 'melakukan operasi'
): ToastErrorConfig {
  // Network error
  const networkError = handleNetworkError(error);
  if (networkError) return networkError;

  // Unauthorized
  if (isUnauthorizedError(error)) {
    return {
      variant: 'destructive',
      title: 'Sesi berakhir',
      description: 'Silakan login kembali',
    };
  }

  // Forbidden
  if (isForbiddenError(error)) {
    return {
      variant: 'destructive',
      title: 'Akses ditolak',
      description: 'Anda tidak memiliki izin untuk melakukan operasi ini',
    };
  }

  // Not found
  if (isNotFoundError(error)) {
    return {
      variant: 'destructive',
      title: 'Data tidak ditemukan',
      description: 'Data yang Anda cari tidak tersedia',
    };
  }

  // Validation error
  if (isValidationError(error)) {
    return {
      variant: 'destructive',
      title: 'Data tidak valid',
      description: error.response?.data?.message || 'Silakan periksa kembali data yang Anda masukkan',
    };
  }

  // Generic error
  return {
    variant: 'destructive',
    title: `Gagal ${context}`,
    description: error.response?.data?.message || 'Terjadi kesalahan',
  };
}
