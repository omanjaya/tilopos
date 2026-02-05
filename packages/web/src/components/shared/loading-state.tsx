import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Loading State Component
 *
 * Consistent loading indicator with optional message.
 * Use for async operations, data fetching, etc.
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingState message="Memuat data..." />}
 *
 * {isSaving && <LoadingState size="sm" />}
 * ```
 */
export function LoadingState({
  message = 'Memuat...',
  className,
  size = 'md',
}: LoadingStateProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={cn('flex items-center justify-center gap-2 p-4', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', iconSizes[size])} />
      {message && (
        <span className={cn('text-muted-foreground', textSizes[size])}>{message}</span>
      )}
    </div>
  );
}

/**
 * Inline Loading State
 *
 * Smaller loading indicator for inline use (buttons, inputs, etc.)
 */
export function InlineLoadingState({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn('h-4 w-4 animate-spin', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Full Page Loading State
 *
 * Centered loading indicator for full page loads.
 */
export function FullPageLoadingState({ message }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
