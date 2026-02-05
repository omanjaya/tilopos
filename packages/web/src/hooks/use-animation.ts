/**
 * useAnimation Hook
 *
 * Provides animation utilities with automatic reduced motion support.
 * When user prefers reduced motion, animations are disabled or simplified.
 */

import { useReducedMotion } from './use-reduced-motion';
import type { Variants, Transition } from 'framer-motion';
import {
  pageVariants,
  fadeVariants,
  slideUpVariants,
  slideRightVariants,
  scaleVariants,
  listContainerVariants,
  listItemVariants,
  cardHoverVariants,
  buttonPressVariants,
  toastVariants,
  backdropVariants,
  counterVariants,
  collapseVariants,
} from '@/lib/animations';

/**
 * Animation presets
 */
export type AnimationPreset =
  | 'page'
  | 'fade'
  | 'slideUp'
  | 'slideRight'
  | 'scale'
  | 'listContainer'
  | 'listItem'
  | 'cardHover'
  | 'buttonPress'
  | 'toast'
  | 'backdrop'
  | 'counter'
  | 'collapse';

/**
 * Get animation variants based on preset
 */
const getVariantsByPreset = (preset: AnimationPreset): Variants => {
  switch (preset) {
    case 'page':
      return pageVariants;
    case 'fade':
      return fadeVariants;
    case 'slideUp':
      return slideUpVariants;
    case 'slideRight':
      return slideRightVariants;
    case 'scale':
      return scaleVariants;
    case 'listContainer':
      return listContainerVariants;
    case 'listItem':
      return listItemVariants;
    case 'cardHover':
      return cardHoverVariants;
    case 'buttonPress':
      return buttonPressVariants;
    case 'toast':
      return toastVariants;
    case 'backdrop':
      return backdropVariants;
    case 'counter':
      return counterVariants;
    case 'collapse':
      return collapseVariants;
  }
};

/**
 * Simplified variants for reduced motion
 */
const getReducedVariants = (preset: AnimationPreset): Variants => {
  // For reduced motion, only use fade effects
  switch (preset) {
    case 'listContainer':
      return {
        initial: {},
        animate: {},
        exit: {},
      };
    case 'cardHover':
    case 'buttonPress':
      return {
        initial: {},
        hover: {},
        tap: {},
      };
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      };
  }
};

export interface UseAnimationReturn {
  /** Animation variants to use with motion components */
  variants: Variants;
  /** Whether animations are enabled (opposite of prefersReducedMotion) */
  isEnabled: boolean;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
}

/**
 * Hook to get animation variants with automatic reduced motion support
 *
 * @param preset - Animation preset name
 * @returns Animation variants and state
 *
 * @example
 * const { variants, isEnabled } = useAnimation('page');
 *
 * return (
 *   <motion.div
 *     variants={variants}
 *     initial="initial"
 *     animate="animate"
 *     exit="exit"
 *   >
 *     Content
 *   </motion.div>
 * );
 */
export function useAnimation(preset: AnimationPreset): UseAnimationReturn {
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion
    ? getReducedVariants(preset)
    : getVariantsByPreset(preset);

  return {
    variants,
    isEnabled: !prefersReducedMotion,
    prefersReducedMotion,
  };
}

/**
 * Get transition config based on reduced motion preference
 */
export function useTransition(transition?: Transition): Transition | undefined {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return {
      duration: 0.15,
    };
  }

  return transition;
}

/**
 * Hook for conditional animation props
 *
 * @example
 * const animationProps = useAnimationProps('page');
 *
 * return <motion.div {...animationProps}>Content</motion.div>;
 */
export function useAnimationProps(preset: AnimationPreset) {
  const { variants, prefersReducedMotion } = useAnimation(preset);

  return {
    variants,
    initial: 'initial' as const,
    animate: 'animate' as const,
    exit: 'exit' as const,
    transition: prefersReducedMotion ? { duration: 0.15 } : undefined,
  };
}
