import { ReactNode, useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MobileTable Component
 *
 * Generic component that converts table data to mobile-friendly card grid.
 * Provides consistent mobile UX patterns across all list pages.
 *
 * Features:
 * - Custom card rendering
 * - Loading skeletons
 * - Empty states
 * - Pull-to-refresh (optional)
 * - Swipeable actions via sheet menu
 *
 * @example
 * ```tsx
 * <MobileTable
 *   data={products}
 *   renderCard={(product) => (
 *     <ProductMobileCard product={product} />
 *   )}
 *   loading={isLoading}
 *   emptyMessage="Belum ada produk"
 *   emptyAction={
 *     <Button onClick={() => navigate('/products/new')}>
 *       Tambah Produk
 *     </Button>
 *   }
 * />
 * ```
 */

interface MobileTableProps<T> {
  /** Array of data items */
  data: T[];
  /** Function to render each card */
  renderCard: (item: T, index: number) => ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton cards to show during loading */
  skeletonCount?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state action button */
  emptyAction?: ReactNode;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Enable pull-to-refresh */
  onRefresh?: () => void;
  /** Refreshing state */
  refreshing?: boolean;
  /** Custom className for container */
  className?: string;
  /** Custom className for cards */
  cardClassName?: string;
  /** Gap between cards (default: 3 = 12px) */
  gap?: 1 | 2 | 3 | 4 | 6 | 8;
}

export function MobileTable<T>({
  data,
  renderCard,
  loading = false,
  skeletonCount = 5,
  emptyMessage = 'Belum ada data',
  emptyDescription,
  emptyAction,
  emptyIcon,
  onRefresh,
  refreshing = false,
  className,
  cardClassName,
  gap = 3,
}: MobileTableProps<T>) {
  const gapClasses = {
    1: 'space-y-1',
    2: 'space-y-2',
    3: 'space-y-3',
    4: 'space-y-4',
    6: 'space-y-6',
    8: 'space-y-8',
  };

  // Pull-to-refresh gesture state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80; // Distance to trigger refresh

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onRefresh || refreshing) return;
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      startY.current = e.touches[0]?.clientY || 0;
      setIsPulling(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || !onRefresh || refreshing) return;
    const currentY = e.touches[0]?.clientY || 0;
    const distance = currentY - startY.current;

    if (distance > 0 && distance < PULL_THRESHOLD * 2) {
      setPullDistance(distance);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isPulling || !onRefresh) return;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      onRefresh();
    }

    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };

  // Reset pull distance when refreshing completes
  useEffect(() => {
    if (!refreshing) {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [refreshing]);

  // Loading State
  if (loading) {
    return (
      <div className={cn(gapClasses[gap], className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <MobileTableSkeleton key={i} className={cardClassName} />
        ))}
      </div>
    );
  }

  // Empty State
  if (data.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
        {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
        <h3 className="font-semibold text-base mb-1">{emptyMessage}</h3>
        {emptyDescription && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {emptyDescription}
          </p>
        )}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  // Data List
  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {onRefresh && (isPulling || refreshing) && (
        <div
          className="absolute left-0 right-0 flex justify-center transition-all duration-200"
          style={{
            top: isPulling ? `${Math.min(pullDistance * 0.5, PULL_THRESHOLD * 0.5)}px` : '0px',
            opacity: isPulling ? Math.min(pullDistance / PULL_THRESHOLD, 1) : refreshing ? 1 : 0,
          }}
        >
          <div className="flex items-center gap-2 py-2 px-4 bg-background/90 backdrop-blur-sm rounded-full shadow-sm">
            <RefreshCw
              className={cn(
                'h-5 w-5 text-primary transition-transform',
                refreshing && 'animate-spin',
                isPulling && !refreshing && 'animate-none',
              )}
              style={{
                transform: isPulling && !refreshing
                  ? `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 360, 360)}deg)`
                  : undefined,
              }}
            />
            {isPulling && !refreshing && pullDistance >= PULL_THRESHOLD && (
              <span className="text-xs text-primary font-medium">Lepas untuk refresh</span>
            )}
            {refreshing && (
              <span className="text-xs text-primary font-medium">Memuat ulang...</span>
            )}
          </div>
        </div>
      )}

      {/* Cards List */}
      <div
        className={gapClasses[gap]}
        style={{
          transform: isPulling ? `translateY(${Math.min(pullDistance * 0.5, PULL_THRESHOLD * 0.5)}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {data.map((item, index) => (
          <div key={index} className={cardClassName}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * MobileTableSkeleton
 * Loading skeleton for mobile table cards
 */
interface MobileTableSkeletonProps {
  className?: string;
  /** Skeleton variant: 'default' (with image) or 'simple' (text only) */
  variant?: 'default' | 'simple';
}

export function MobileTableSkeleton({
  className,
  variant = 'default',
}: MobileTableSkeletonProps) {
  if (variant === 'simple') {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="h-16 w-16 rounded-md bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MobileTableCard
 * Generic card wrapper with built-in actions menu
 */
interface MobileTableCardProps {
  /** Card content */
  children: ReactNode;
  /** Actions to show in sheet menu */
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
  /** Show actions trigger button */
  showActions?: boolean;
  /** Custom className */
  className?: string;
}

export function MobileTableCard({
  children,
  actions,
  showActions = true,
  className,
}: MobileTableCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">{children}</CardContent>

      {/* Actions Sheet */}
      {showActions && actions && actions.length > 0 && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Pilih Aksi</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 mt-4">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={cn(
                    'w-full justify-start h-12',
                    action.variant === 'destructive' &&
                      'text-destructive hover:text-destructive hover:bg-destructive/10'
                  )}
                  onClick={() => {
                    action.onClick();
                    setMenuOpen(false);
                  }}
                >
                  {action.icon && <span className="mr-3">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
}

// Import React for useState in MobileTableCard
import * as React from 'react';
