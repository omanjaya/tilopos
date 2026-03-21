import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';
import { toast } from '@/lib/toast-utils';

/**
 * Marker key set on AxiosError to indicate the interceptor already showed a toast.
 * Downstream handlers can check this to avoid duplicate toasts.
 */
export const ERROR_HANDLED_KEY = '__errorHandled';

/**
 * Check if an error was already handled (toasted) by the interceptor.
 */
export function isErrorHandled(error: unknown): boolean {
  return !!(error as Record<string, unknown>)?.[ERROR_HANDLED_KEY];
}

/**
 * Mark an error as handled so downstream handlers skip it.
 */
export function markErrorHandled(error: unknown): void {
  if (error && typeof error === 'object') {
    (error as Record<string, unknown>)[ERROR_HANDLED_KEY] = true;
  }
}

/**
 * Get a user-friendly Indonesian error message based on HTTP status code.
 */
export function getErrorMessage(error: AxiosError<ApiErrorResponse>): {
  title: string;
  description?: string;
} {
  const serverMessage = error.response?.data?.message;
  const status = error.response?.status;

  // Network / no response
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        title: 'Koneksi timeout',
        description: 'Server terlalu lama merespons. Silakan coba lagi.',
      };
    }
    return {
      title: 'Tidak dapat terhubung',
      description: 'Periksa koneksi internet Anda dan coba lagi.',
    };
  }

  switch (status) {
    case 400:
      return {
        title: 'Data tidak valid',
        description: serverMessage || 'Periksa kembali data yang Anda masukkan.',
      };
    case 403:
      return {
        title: 'Akses ditolak',
        description: serverMessage || 'Anda tidak memiliki izin untuk melakukan aksi ini.',
      };
    case 404:
      return {
        title: 'Data tidak ditemukan',
        description: serverMessage || 'Data yang Anda cari tidak ditemukan atau sudah dihapus.',
      };
    case 409:
      return {
        title: 'Data konflik',
        description: serverMessage || 'Data sudah ada atau sedang diproses oleh pengguna lain.',
      };
    case 422:
      return {
        title: 'Data tidak dapat diproses',
        description: serverMessage || 'Periksa kembali data yang Anda masukkan.',
      };
    case 429:
      return {
        title: 'Terlalu banyak permintaan',
        description: 'Silakan tunggu beberapa saat sebelum mencoba lagi.',
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        title: 'Terjadi kesalahan server',
        description: 'Silakan coba lagi nanti. Jika masalah berlanjut, hubungi support.',
      };
    default:
      return {
        title: 'Terjadi kesalahan',
        description: serverMessage || 'Silakan coba lagi.',
      };
  }
}

/**
 * Handle mutation errors in a consistent way.
 *
 * Use as `onError` callback in useMutation, or call directly.
 *
 * @param error - The Axios error
 * @param contextTitle - Optional override for the toast title (e.g., "Gagal menghapus produk")
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: productsApi.delete,
 *   onError: (error) => handleMutationError(error, 'Gagal menghapus produk'),
 * });
 * ```
 */
export function handleMutationError(
  error: unknown,
  contextTitle?: string,
): void {
  // Skip if already handled by interceptor
  if (isErrorHandled(error)) return;

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const { title, description } = getErrorMessage(axiosError);

  toast.error({
    title: contextTitle || title,
    description: contextTitle ? description || title : description,
  });
}
