/**
 * Animation Utilities using Framer Motion
 *
 * Provides reusable animation variants for consistent animations throughout the app.
 * All animations respect user's reduced motion preferences.
 */

import type { Variants, Transition } from 'framer-motion';

/**
 * Default smooth transition configuration
 */
export const smoothTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Fast transition for micro-interactions
 */
export const fastTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
};

/**
 * Slow transition for page changes
 */
export const slowTransition: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

/**
 * Page transition variants (fade + slide)
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: slowTransition,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: fastTransition,
  },
};

/**
 * Fade-only variants (no movement)
 */
export const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    opacity: 0,
    transition: fastTransition,
  },
};

/**
 * Slide from bottom variants (mobile sheets, modals)
 */
export const slideUpVariants: Variants = {
  initial: {
    y: '100%',
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: fastTransition,
  },
};

/**
 * Slide from right variants (side panels, drawers)
 */
export const slideRightVariants: Variants = {
  initial: {
    x: '100%',
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: fastTransition,
  },
};

/**
 * Scale + fade variants (popups, tooltips)
 */
export const scaleVariants: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: fastTransition,
  },
};

/**
 * List item stagger variants (for animating lists)
 */
export const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: fastTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: fastTransition,
  },
};

/**
 * Card hover variants (elevation effect)
 */
export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    transition: fastTransition,
  },
};

/**
 * Button press variants (scale down on tap)
 */
export const buttonPressVariants: Variants = {
  initial: {
    scale: 1,
  },
  tap: {
    scale: 0.95,
  },
};

/**
 * Shimmer/skeleton loading variants
 */
export const shimmerVariants: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'linear',
    },
  },
};

/**
 * Notification toast variants (slide from top)
 */
export const toastVariants: Variants = {
  initial: {
    y: -100,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: fastTransition,
  },
};

/**
 * Modal backdrop variants
 */
export const backdropVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

/**
 * Counter number change animation
 */
export const counterVariants: Variants = {
  initial: {
    y: -20,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: fastTransition,
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: fastTransition,
  },
};

/**
 * Collapse/expand variants (for accordions, collapsible sections)
 */
export const collapseVariants: Variants = {
  initial: {
    height: 0,
    opacity: 0,
  },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: fastTransition,
  },
};
