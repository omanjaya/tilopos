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
 *
 * Usage:
 * ```tsx
 * <MobileBottomSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Sheet Title"
 *   description="Optional description"
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
}: MobileBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          // Rounded top corners for mobile
          'rounded-t-3xl',
          // Remove default padding for custom spacing
          'p-0',
          // Max height with scroll
          'max-h-[95vh] overflow-hidden flex flex-col',
          // Custom height if provided
          height !== 'auto' && `h-[${height}]`,
          className
        )}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div className="flex justify-center py-3 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
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
 * ```
 */
