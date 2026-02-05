import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

/**
 * Enhanced loading spinner with optional text
 * Provides better visual feedback during async operations
 */
export function LoadingSpinnerEnhanced({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        {/* Pulsing background */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-subtle" />

        {/* Spinner */}
        <Loader2 className={cn(sizes[size], 'relative animate-spin text-primary')} />
      </div>

      {text && (
        <p className={cn(textSizes[size], 'text-muted-foreground animate-pulse-subtle')}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Full page loading overlay
 */
export function LoadingOverlay({ text = 'Memuat...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <LoadingSpinnerEnhanced size="lg" text={text} />
    </div>
  );
}
