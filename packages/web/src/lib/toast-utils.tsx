import { toast as baseToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  action?: ReactNode;
  duration?: number;
}

/**
 * Enhanced toast utilities with icons and better UX
 */
export const toast = {
  /**
   * Success toast with checkmark icon
   */
  success: ({ title, description, duration }: Omit<ToastOptions, 'action'>) => {
    return baseToast({
      title,
      description: description ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span>{description}</span>
        </div>
      ) : undefined,
      duration: duration ?? 3000,
      className: 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800',
    });
  },

  /**
   * Error toast with X icon
   */
  error: ({ title, description, duration }: Omit<ToastOptions, 'action'>) => {
    return baseToast({
      variant: 'destructive',
      title,
      description: description ? (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{description}</span>
        </div>
      ) : undefined,
      duration: duration ?? 5000,
    });
  },

  /**
   * Warning toast with alert icon
   */
  warning: ({ title, description, duration }: Omit<ToastOptions, 'action'>) => {
    return baseToast({
      title,
      description: description ? (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
          <span>{description}</span>
        </div>
      ) : undefined,
      duration: duration ?? 4000,
      className: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800',
    });
  },

  /**
   * Info toast with info icon
   */
  info: ({ title, description, duration }: Omit<ToastOptions, 'action'>) => {
    return baseToast({
      title,
      description: description ? (
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{description}</span>
        </div>
      ) : undefined,
      duration: duration ?? 3000,
      className: 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800',
    });
  },

  /**
   * Loading toast with spinner
   */
  loading: ({ title, description, duration }: Omit<ToastOptions, 'action'>) => {
    return baseToast({
      title,
      description: description ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{description}</span>
        </div>
      ) : undefined,
      duration: duration ?? 0, // No auto-dismiss for loading
      className: 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800',
    });
  },

  /**
   * Promise toast - shows loading, then success/error
   */
  promise: async <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ): Promise<T> => {
    const loadingToast = toast.loading({ title: options.loading });

    try {
      const data = await promise;
      loadingToast.dismiss();
      toast.success({
        title: typeof options.success === 'function' ? options.success(data) : options.success,
      });
      return data;
    } catch (error) {
      loadingToast.dismiss();
      toast.error({
        title:
          typeof options.error === 'function'
            ? options.error(error as Error)
            : options.error,
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  },
};
