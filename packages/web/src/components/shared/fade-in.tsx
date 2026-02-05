/**
 * FadeIn Component
 *
 * Simple fade-in animation wrapper.
 * Useful for content that appears after loading or on page load.
 *
 * @example
 * <FadeIn>
 *   <div>Content that fades in</div>
 * </FadeIn>
 */

import { motion } from 'framer-motion';
import { useAnimation } from '@/hooks/use-animation';
import type { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Animation duration (in seconds) */
  duration?: number;
}

/**
 * Fade in animation wrapper
 */
export function FadeIn({ children, className, delay = 0, duration }: FadeInProps) {
  const { variants, prefersReducedMotion } = useAnimation('fade');

  // Override animation duration if provided
  const customVariants = duration
    ? {
        ...variants,
        animate: {
          ...variants.animate,
          transition: { duration, delay },
        },
      }
    : variants;

  return (
    <motion.div
      variants={customVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      transition={
        delay > 0 && !prefersReducedMotion
          ? { delay }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

/**
 * Usage Examples:
 *
 * // Basic fade in
 * <FadeIn>
 *   <DashboardContent />
 * </FadeIn>
 *
 * // With delay
 * <FadeIn delay={0.2}>
 *   <SecondaryContent />
 * </FadeIn>
 *
 * // With custom duration
 * <FadeIn duration={0.5} delay={0.1}>
 *   <SlowReveal />
 * </FadeIn>
 *
 * // Multiple items with staggered delay
 * {items.map((item, i) => (
 *   <FadeIn key={item.id} delay={i * 0.1}>
 *     <ItemCard item={item} />
 *   </FadeIn>
 * ))}
 */
