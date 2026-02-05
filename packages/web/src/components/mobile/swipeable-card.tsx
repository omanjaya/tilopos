/**
 * SwipeableCard Component
 *
 * Mobile-optimized card with swipe gestures for quick actions.
 * - Swipe right: Primary action (e.g., Edit) - blue background
 * - Swipe left: Danger action (e.g., Delete) - red background
 * - Spring animation back to center
 * - Touch-friendly (works on mobile browsers)
 *
 * @example
 * <SwipeableCard
 *   onEdit={() => console.log('Edit')}
 *   onDelete={() => console.log('Delete')}
 * >
 *   <ProductCard product={product} />
 * </SwipeableCard>
 */

import { useRef, useState, useCallback, type ReactNode, type TouchEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  threshold?: number;
  className?: string;
}

export function SwipeableCard({
  children,
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  threshold = 80,
  className,
}: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    startX.current = touch.clientX;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    if (!touch) return;
    currentX.current = touch.clientX;
    const diff = currentX.current - startX.current;

    // Add resistance at edges
    const resistance = 0.5;
    const maxTranslate = 120;

    if (Math.abs(diff) > maxTranslate) {
      setTranslateX(diff > 0 ? maxTranslate : -maxTranslate);
    } else {
      setTranslateX(diff * resistance);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    // Check if threshold reached
    if (translateX > threshold && onEdit) {
      // Trigger edit action
      onEdit();
    } else if (translateX < -threshold && onDelete) {
      // Trigger delete action
      onDelete();
    }

    // Spring back to center
    setTranslateX(0);
  }, [translateX, threshold, onEdit, onDelete]);

  const showEditAction = translateX > 20 && onEdit;
  const showDeleteAction = translateX < -20 && onDelete;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {/* Edit Action (Right Swipe) */}
        <div
          className={cn(
            'flex items-center gap-2 text-blue-600 transition-opacity',
            showEditAction ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Pencil className="h-5 w-5" />
          <span className="font-medium">{editLabel}</span>
        </div>

        {/* Delete Action (Left Swipe) */}
        <div
          className={cn(
            'ml-auto flex items-center gap-2 text-destructive transition-opacity',
            showDeleteAction ? 'opacity-100' : 'opacity-0'
          )}
        >
          <span className="font-medium">{deleteLabel}</span>
          <Trash2 className="h-5 w-5" />
        </div>
      </div>

      {/* Card Content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className={cn(
          'relative z-10 bg-background',
          showEditAction && 'bg-blue-50/50 dark:bg-blue-950/20',
          showDeleteAction && 'bg-destructive/5'
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Usage Examples:
 *
 * // Basic usage with both actions
 * <SwipeableCard
 *   onEdit={() => navigate(`/edit/${item.id}`)}
 *   onDelete={() => setDeleteTarget(item)}
 * >
 *   <ItemCard item={item} />
 * </SwipeableCard>
 *
 * // Custom labels
 * <SwipeableCard
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   editLabel="Ubah"
 *   deleteLabel="Hapus"
 *   threshold={100}
 * >
 *   <ProductCard product={product} />
 * </SwipeableCard>
 *
 * // Edit only (no delete)
 * <SwipeableCard onEdit={handleEdit}>
 *   <OrderCard order={order} />
 * </SwipeableCard>
 */
