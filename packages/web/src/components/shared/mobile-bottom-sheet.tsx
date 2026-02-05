import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * MobileBottomSheet Component
 *
 * Enhanced bottom sheet for mobile with:
 * - Drag handle visual indicator
 * - Backdrop blur effect
 * - Rounded top corners
 * - Better mobile UX
 * - Auto-height based on content
 * - Snap points support (half-screen, full-screen)
 * - Drag gesture handling with smooth animations
 *
 * Usage:
 * ```tsx
 * <MobileBottomSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Sheet Title"
 *   description="Optional description"
 *   snapPoints={[0.5, 0.9]} // 50% and 90% of viewport height
 * >
 *   <div>Your content here</div>
 * </MobileBottomSheet>
 * ```
 */

interface MobileBottomSheetProps {
  /** Controls sheet open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Sheet title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Sheet content */
  children: React.ReactNode;
  /** Additional class for content wrapper */
  className?: string;
  /** Show drag handle (default: true) */
  showDragHandle?: boolean;
  /** Custom height (e.g., "80vh", "500px", "auto") */
  height?: string;
  /** Snap points as percentages of viewport height (e.g., [0.5, 0.9]) */
  snapPoints?: number[];
  /** Initial snap point index (default: 0) */
  initialSnapPoint?: number;
  /** Callback when snap point changes */
  onSnapPointChange?: (snapIndex: number) => void;
}

export function MobileBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showDragHandle = true,
  height = 'auto',
  snapPoints,
  initialSnapPoint = 0,
  onSnapPointChange,
}: MobileBottomSheetProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [currentSnapIndex, setCurrentSnapIndex] = React.useState(initialSnapPoint);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);
  const [translateY, setTranslateY] = React.useState(0);

  // Calculate height based on snap points
  const calculateHeight = React.useCallback(() => {
    if (!snapPoints || snapPoints.length === 0) {
      return height !== 'auto' ? height : undefined;
    }
    const snapPoint = snapPoints[currentSnapIndex];
    if (snapPoint === undefined) {
      const firstSnap = snapPoints[0];
      return firstSnap !== undefined ? `${firstSnap * 100}vh` : undefined;
    }
    return `${snapPoint * 100}vh`;
  }, [snapPoints, currentSnapIndex, height]);

  // Handle touch start
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!snapPoints || snapPoints.length === 0) return;
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setStartY(touch.clientY);
    setCurrentY(touch.clientY);
  }, [snapPoints]);

  // Handle touch move
  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging || !snapPoints) return;
    const touch = e.touches[0];
    if (!touch) return;
    const newY = touch.clientY;
    setCurrentY(newY);
    const diff = newY - startY;

    // Only allow dragging down or up between snap points
    if (diff > 0 || (diff < 0 && currentSnapIndex < snapPoints.length - 1)) {
      setTranslateY(diff);
    }
  }, [isDragging, startY, snapPoints, currentSnapIndex]);

  // Handle touch end - snap to nearest point
  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging || !snapPoints) return;
    setIsDragging(false);

    const diff = currentY - startY;
    const threshold = 50; // 50px threshold to trigger snap

    let newSnapIndex = currentSnapIndex;

    // Dragged down significantly - go to smaller snap point
    if (diff > threshold && currentSnapIndex > 0) {
      newSnapIndex = currentSnapIndex - 1;
    }
    // Dragged up significantly - go to larger snap point
    else if (diff < -threshold && currentSnapIndex < snapPoints.length - 1) {
      newSnapIndex = currentSnapIndex + 1;
    }
    // Dragged down past first snap point - close sheet
    else if (diff > threshold * 2 && currentSnapIndex === 0) {
      onOpenChange(false);
      setTranslateY(0);
      return;
    }

    // Update snap point
    if (newSnapIndex !== currentSnapIndex) {
      setCurrentSnapIndex(newSnapIndex);
      onSnapPointChange?.(newSnapIndex);
    }

    // Reset translate
    setTranslateY(0);
  }, [isDragging, currentY, startY, currentSnapIndex, snapPoints, onOpenChange, onSnapPointChange]);

  // Reset snap index when sheet opens
  React.useEffect(() => {
    if (open && snapPoints) {
      setCurrentSnapIndex(initialSnapPoint);
      setTranslateY(0);
    }
  }, [open, initialSnapPoint, snapPoints]);

  const sheetHeight = calculateHeight();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={contentRef}
        side="bottom"
        className={cn(
          // Rounded top corners for mobile
          'rounded-t-3xl',
          // Remove default padding for custom spacing
          'p-0',
          // Max height with scroll
          'max-h-[95vh] overflow-hidden flex flex-col',
          // Custom height if provided
          !snapPoints && height !== 'auto' && `h-[${height}]`,
          className
        )}
        style={{
          height: sheetHeight,
          transform: isDragging ? `translateY(${translateY}px)` : undefined,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            className="flex justify-center py-3 shrink-0 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className={cn(
              "w-12 h-1.5 rounded-full bg-muted-foreground/20 transition-all",
              isDragging && "w-16 bg-muted-foreground/40"
            )} />
          </div>
        )}

        {/* Header (if title or description provided) */}
        {(title || description) && (
          <SheetHeader className="px-6 pb-4 shrink-0">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}

        {/* Content with scroll */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * MobileBottomSheetTrigger
 * Trigger button for MobileBottomSheet
 */
interface MobileBottomSheetTriggerProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export function MobileBottomSheetTrigger({
  children,
  onClick,
  className,
}: MobileBottomSheetTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn('touch-manipulation', className)}
    >
      {children}
    </button>
  );
}

/**
 * MobileBottomSheetActions
 * Action buttons section (typically at bottom of sheet)
 */
interface MobileBottomSheetActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileBottomSheetActions({
  children,
  className,
}: MobileBottomSheetActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 pt-4 border-t mt-4',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Example Usage:
 *
 * ```tsx
 * // Basic usage
 * function MyComponent() {
 *   const [open, setOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <MobileBottomSheetTrigger onClick={() => setOpen(true)}>
 *         <Button>Open Sheet</Button>
 *       </MobileBottomSheetTrigger>
 *
 *       <MobileBottomSheet
 *         open={open}
 *         onOpenChange={setOpen}
 *         title="Filter Products"
 *         description="Select filter options"
 *       >
 *         <div className="space-y-4">
 *           <div>Filter content here</div>
 *
 *           <MobileBottomSheetActions>
 *             <Button onClick={() => handleApply()}>Apply Filters</Button>
 *             <Button variant="outline" onClick={() => setOpen(false)}>
 *               Cancel
 *             </Button>
 *           </MobileBottomSheetActions>
 *         </div>
 *       </MobileBottomSheet>
 *     </>
 *   );
 * }
 *
 * // With snap points
 * function MyComponentWithSnapPoints() {
 *   const [open, setOpen] = useState(false);
 *   const [snapIndex, setSnapIndex] = useState(0);
 *
 *   return (
 *     <MobileBottomSheet
 *       open={open}
 *       onOpenChange={setOpen}
 *       title="Product Details"
 *       snapPoints={[0.5, 0.9]} // 50% and 90% of viewport height
 *       initialSnapPoint={0}
 *       onSnapPointChange={setSnapIndex}
 *     >
 *       <div>
 *         <p>Drag the handle to snap between sizes</p>
 *         <p>Current snap: {snapIndex === 0 ? 'Half' : 'Full'} screen</p>
 *       </div>
 *     </MobileBottomSheet>
 *   );
 * }
 * ```
 */
