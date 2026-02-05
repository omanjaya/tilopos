/**
 * AnimatedList Component
 *
 * Wrapper component that applies stagger animations to list items.
 * Automatically respects user's reduced motion preference.
 *
 * @example
 * <AnimatedList>
 *   {items.map(item => (
 *     <AnimatedListItem key={item.id}>
 *       <ProductCard product={item} />
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 */

import { motion } from 'framer-motion';
import { useAnimation } from '@/hooks/use-animation';
import type { ReactNode } from 'react';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container component for animated lists
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  const { variants } = useAnimation('listContainer');

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Individual list item with animation
 */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  const { variants } = useAnimation('listItem');

  return (
    <motion.div
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Usage Examples:
 *
 * // Basic usage
 * <AnimatedList className="grid grid-cols-3 gap-4">
 *   {products.map(product => (
 *     <AnimatedListItem key={product.id}>
 *       <ProductCard product={product} />
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 *
 * // With custom styling
 * <AnimatedList className="flex flex-col gap-2">
 *   {customers.map(customer => (
 *     <AnimatedListItem key={customer.id}>
 *       <CustomerRow customer={customer} />
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 *
 * // In mobile grids
 * <AnimatedList className="grid grid-cols-1 gap-3 p-4">
 *   {items.map(item => (
 *     <AnimatedListItem key={item.id}>
 *       <SwipeableCard onEdit={() => {}} onDelete={() => {}}>
 *         <ItemCard item={item} />
 *       </SwipeableCard>
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 */
