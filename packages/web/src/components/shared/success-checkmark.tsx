import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Animated success checkmark component
 * Shows a checkmark with a scale-in animation
 */
export function SuccessCheckmark({ size = 'md', className }: SuccessCheckmarkProps) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Background pulse */}
      <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />

      {/* Checkmark icon */}
      <CheckCircle2
        className={cn(
          sizes[size],
          'relative text-green-600 animate-in zoom-in-50 duration-300'
        )}
      />
    </div>
  );
}
