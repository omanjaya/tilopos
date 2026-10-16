import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingSpinner Component
 *
 * Simple centered loading spinner for page-level loading states.
 * Used as fallback in Suspense boundaries and route transitions.
 */

interface LoadingSpinnerProps {
  /** Size of the spinner. Defaults to 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message to display below spinner */
  message?: string;
  /** Custom className for the container */
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

export function LoadingSpinner({
  size = 'md',
  message,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || 'Memuat...'}
    >
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      <span className="sr-only">{message || 'Memuat...'}</span>
    </div>
  );
}
