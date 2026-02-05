/**
 * AnimatedCard Component
 *
 * Card wrapper with subtle hover animations and press effects.
 * Automatically respects user's reduced motion preference.
 *
 * @example
 * <AnimatedCard onClick={handleClick}>
 *   <ProductCard product={product} />
 * </AnimatedCard>
 */

import { motion } from 'framer-motion';
import { useAnimation } from '@/hooks/use-animation';
import { cn } from '@/lib/utils';
import type { ReactNode, MouseEvent } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  /** Enable press animation on tap/click */
  pressable?: boolean;
  /** Click handler */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** Hover effect enabled (default: true if onClick is provided) */
  hoverable?: boolean;
}

/**
 * Card with hover and press animations
 */
export function AnimatedCard({
  children,
  className,
  pressable = true,
  onClick,
  hoverable = !!onClick,
}: AnimatedCardProps) {
  const { variants: hoverVariants, isEnabled } = useAnimation('cardHover');

  // If animations disabled, render static div
  if (!isEnabled) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        'transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      variants={hoverable ? hoverVariants : undefined}
      whileHover={hoverable ? 'hover' : undefined}
      whileTap={pressable && onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

/**
 * Usage Examples:
 *
 * // Interactive card with hover + press
 * <AnimatedCard onClick={() => navigate(`/products/${id}`)}>
 *   <ProductCard product={product} />
 * </AnimatedCard>
 *
 * // Hover only (no press effect)
 * <AnimatedCard hoverable pressable={false}>
 *   <MetricCard title="Sales" value="$1,234" />
 * </AnimatedCard>
 *
 * // Static card (no animations)
 * <AnimatedCard hoverable={false} pressable={false}>
 *   <InfoCard content="..." />
 * </AnimatedCard>
 */
