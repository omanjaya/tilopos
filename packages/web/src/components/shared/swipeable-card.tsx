import { ReactNode, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * SwipeableCard Component
 *
 * Card wrapper with swipe-to-reveal actions for mobile:
 * - Swipe left to reveal action buttons
 * - Swipe right to dismiss/close
 * - Smooth animations
 * - Configurable actions (edit, delete, etc.)
 * - Touch-optimized
 *
 * Usage:
 * ```tsx
 * <SwipeableCard
 *   actions={[
 *     {
 *       label: 'Edit',
 *       icon: <Edit className="h-4 w-4" />,
 *       onClick: () => handleEdit(item),
 *       variant: 'default',
 *     },
 *     {
 *       label: 'Delete',
 *       icon: <Trash2 className="h-4 w-4" />,
 *       onClick: () => handleDelete(item),
 *       variant: 'destructive',
 *     },
 *   ]}
 * >
 *   <Card>Your card content</Card>
 * </SwipeableCard>
 * ```
 */

export interface SwipeAction {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'default' | 'destructive' | 'secondary';
}

export interface SwipeableCardProps {
  /** Card content */
  children: ReactNode;
  /** Swipe actions */
  actions?: SwipeAction[];
  /** Enable swipe (default: true) */
  enabled?: boolean;
  /** Custom className */
  className?: string;
  /** Swipe threshold to reveal actions (default: 80px) */
  threshold?: number;
}

export function SwipeableCard({
  children,
  actions = [],
  enabled = true,
  className,
  threshold = 80,
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Action buttons width (each button ~80px)
  const actionsWidth = actions.length * 80;

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled || actions.length === 0) return;
    startX.current = e.touches[0].clientX;
    currentX.current = offset;
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !enabled) return;

    const touchX = e.touches[0].clientX;
    const diff = touchX - startX.current;
    const newOffset = currentX.current + diff;

    // Constrain offset: 0 (closed) to -actionsWidth (fully open)
    const constrainedOffset = Math.max(Math.min(newOffset, 0), -actionsWidth);
    setOffset(constrainedOffset);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging || !enabled) return;
    setIsDragging(false);

    // Snap to closed or revealed based on threshold
    if (offset < -threshold) {
      // Reveal actions
      setOffset(-actionsWidth);
      setIsRevealed(true);
    } else {
      // Close
      setOffset(0);
      setIsRevealed(false);
    }
  };

  // Handle action click
  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    // Close after action
    setOffset(0);
    setIsRevealed(false);
  };

  // Close programmatically
  const handleClose = () => {
    setOffset(0);
    setIsRevealed(false);
  };

  // If no actions or disabled, render without swipe
  if (!enabled || actions.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Action Buttons (behind card) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'default'}
            size="sm"
            className={cn(
              'h-full rounded-none min-w-[80px] flex flex-col gap-1 px-3',
              action.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              action.variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              !action.variant && 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            onClick={() => handleActionClick(action)}
            aria-label={action.label}
          >
            {action.icon && <span>{action.icon}</span>}
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Card Content (swipeable) */}
      <div
        className={cn(
          'relative bg-background transition-transform',
          isDragging ? 'duration-0' : 'duration-300 ease-out'
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isRevealed ? handleClose : undefined}
      >
        {children}
      </div>

      {/* Overlay hint when revealed */}
      {isRevealed && (
        <div
          className="absolute inset-0 bg-black/5 pointer-events-none"
          style={{ transform: `translateX(${offset}px)` }}
        />
      )}
    </div>
  );
}

/**
 * Example Usage:
 *
 * ```tsx
 * import { SwipeableCard } from '@/components/shared/swipeable-card';
 * import { Edit, Trash2 } from 'lucide-react';
 *
 * function ProductCard({ product, onEdit, onDelete }) {
 *   return (
 *     <SwipeableCard
 *       actions={[
 *         {
 *           label: 'Edit',
 *           icon: <Edit className="h-4 w-4" />,
 *           onClick: () => onEdit(product),
 *           variant: 'default',
 *         },
 *         {
 *           label: 'Delete',
 *           icon: <Trash2 className="h-4 w-4" />,
 *           onClick: () => onDelete(product),
 *           variant: 'destructive',
 *         },
 *       ]}
 *     >
 *       <Card>
 *         <CardContent>
 *           <h3>{product.name}</h3>
 *           <p>{product.price}</p>
 *         </CardContent>
 *       </Card>
 *     </SwipeableCard>
 *   );
 * }
 * ```
 */
