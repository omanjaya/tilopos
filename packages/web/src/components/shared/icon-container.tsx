import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * IconContainer Component
 *
 * Reusable icon container with consistent styling.
 * Eliminates duplication across 11+ files that use this pattern.
 *
 * Pattern replaced:
 * ```tsx
 * <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
 *   <Icon className="h-6 w-6 text-primary" />
 * </div>
 * ```
 *
 * Usage:
 * ```tsx
 * import { IconContainer } from '@/components/shared/icon-container';
 * import { Package } from 'lucide-react';
 *
 * <IconContainer icon={Package} />
 * <IconContainer icon={Package} variant="success" size="lg" />
 * <IconContainer icon={Package} className="bg-blue-500/10">
 *   <Package className="h-6 w-6 text-blue-500" />
 * </IconContainer>
 * ```
 */

export interface IconContainerProps {
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Shape variant */
  shape?: 'square' | 'circle';
  /** Additional CSS classes */
  className?: string;
  /** Custom icon element (overrides icon prop) */
  children?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-600/10 text-green-600',
  warning: 'bg-yellow-600/10 text-yellow-600',
  danger: 'bg-red-600/10 text-red-600',
  info: 'bg-blue-600/10 text-blue-600',
  muted: 'bg-muted text-muted-foreground',
};

const sizeClasses = {
  sm: {
    container: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
  md: {
    container: 'h-12 w-12',
    icon: 'h-6 w-6',
  },
  lg: {
    container: 'h-16 w-16',
    icon: 'h-8 w-8',
  },
};

const shapeClasses = {
  square: 'rounded-lg',
  circle: 'rounded-full',
};

export function IconContainer({
  icon: Icon,
  variant = 'primary',
  size = 'md',
  shape = 'square',
  className,
  children,
}: IconContainerProps) {
  const containerSize = sizeClasses[size].container;
  const iconSize = sizeClasses[size].icon;
  const variantClass = variantClasses[variant];
  const shapeClass = shapeClasses[shape];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        containerSize,
        shapeClass,
        variantClass,
        className
      )}
    >
      {children || (Icon && <Icon className={iconSize} />)}
    </div>
  );
}

/**
 * Example Usage:
 *
 * ```tsx
 * // Basic usage
 * <IconContainer icon={Package} />
 *
 * // With variants
 * <IconContainer icon={Check} variant="success" />
 * <IconContainer icon={AlertTriangle} variant="warning" />
 * <IconContainer icon={XCircle} variant="danger" />
 *
 * // Different sizes
 * <IconContainer icon={Package} size="sm" />
 * <IconContainer icon={Package} size="lg" />
 *
 * // Different shapes
 * <IconContainer icon={User} shape="circle" />
 *
 * // Custom styling
 * <IconContainer
 *   icon={Star}
 *   className="bg-purple-500/10 text-purple-500"
 * />
 *
 * // With custom children
 * <IconContainer variant="primary">
 *   <span className="text-lg font-bold">A</span>
 * </IconContainer>
 * ```
 */
