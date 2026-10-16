import { isAxiosError } from 'axios';

/** Extract the backend's error message (e.g. "Shift already open") with an Indonesian fallback. */
export function apiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
    if (isAxiosError<{ message?: string | string[] }>(error)) {
        const msg = error.response?.data?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}
