import * as React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PullToRefresh Component
 *
 * Enables pull-to-refresh gesture for mobile devices:
 * - Touch gesture detection
 * - Pull indicator (spinner + text)
 * - Release to refresh behavior
 * - Loading state management
 * - Only works on mobile/touch devices
 * - Smooth animations with spring physics
 * - Customizable refresh threshold
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => {
 *   await fetchData();
 * }}>
 *   <div className="content">
 *     Your scrollable content here
 *   </div>
 * </PullToRefresh>
 * ```
 */

export interface PullToRefreshProps {
  /** Content to wrap with pull-to-refresh */
  children: React.ReactNode;
  /** Async callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Pull distance threshold to trigger refresh in pixels (default: 80) */
  refreshThreshold?: number;
  /** Maximum pull distance in pixels (default: 150) */
  maxPullDistance?: number;
  /** Enable pull-to-refresh (default: true) */
  enabled?: boolean;
  /** Custom className for wrapper */
  className?: string;
  /** Pulling text (default: "Pull to refresh") */
  pullingText?: string;
  /** Release text (default: "Release to refresh") */
  releaseText?: string;
  /** Refreshing text (default: "Refreshing...") */
  refreshingText?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  refreshThreshold = 80,
  maxPullDistance = 150,
  enabled = true,
  className,
  pullingText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  refreshingText = 'Refreshing...',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPulling, setIsPulling] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [canPull, setCanPull] = React.useState(false);
  const startY = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Check if device supports touch
  const isTouchDevice = React.useMemo(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Check if container is scrolled to top
  const isScrolledToTop = React.useCallback(() => {
    if (!containerRef.current) return false;
    const scrollableElement = containerRef.current.querySelector('[data-scrollable]') as HTMLElement;
    if (scrollableElement) {
      return scrollableElement.scrollTop === 0;
    }
    return containerRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    if (!enabled || !isTouchDevice || isRefreshing) return;

    // Only allow pull when scrolled to top
    if (isScrolledToTop()) {
      setCanPull(true);
      startY.current = e.touches[0]?.clientY || 0;
    }
  }, [enabled, isTouchDevice, isRefreshing, isScrolledToTop]);

  // Handle touch move
  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (!canPull || !enabled || isRefreshing) return;

    const currentY = e.touches[0]?.clientY || 0;
    const diff = currentY - startY.current;

    // Only track pulling down (positive diff)
    if (diff > 0) {
      // Prevent default scroll behavior when pulling
      if (isScrolledToTop() && diff > 10) {
        e.preventDefault();
      }

      // Apply resistance curve: pull distance increases slower as you pull further
      const resistance = 0.5;
      const adjustedDiff = Math.pow(diff, resistance) * 2;
      const constrainedDistance = Math.min(adjustedDiff, maxPullDistance);

      setPullDistance(constrainedDistance);
      setIsPulling(constrainedDistance > 0);
    }
  }, [canPull, enabled, isRefreshing, maxPullDistance, isScrolledToTop]);

  // Handle touch end
  const handleTouchEnd = React.useCallback(() => {
    if (!canPull || !enabled || isRefreshing) return;

    setCanPull(false);

    // Trigger refresh if pulled beyond threshold
    if (pullDistance >= refreshThreshold) {
      setIsRefreshing(true);
      setIsPulling(false);

      // Call onRefresh and handle completion
      onRefresh()
        .then(() => {
          // Success feedback
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500); // Small delay for smooth animation
        })
        .catch((error) => {
          console.error('Refresh failed:', error);
          setIsRefreshing(false);
          setPullDistance(0);
        });
    } else {
      // Reset if not pulled enough
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [canPull, enabled, isRefreshing, pullDistance, refreshThreshold, onRefresh]);

  // Register touch event listeners
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !isTouchDevice) return;

    // Use passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate indicator opacity and rotation based on pull distance
  const indicatorOpacity = Math.min(pullDistance / refreshThreshold, 1);
  const indicatorRotation = (pullDistance / maxPullDistance) * 360;
  const shouldRelease = pullDistance >= refreshThreshold;

  // Status text based on state
  const statusText = React.useMemo(() => {
    if (isRefreshing) return refreshingText;
    if (shouldRelease) return releaseText;
    return pullingText;
  }, [isRefreshing, shouldRelease, pullingText, releaseText, refreshingText]);

  // If not a touch device or disabled, just render children
  if (!isTouchDevice || !enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex flex-col items-center justify-center',
          'transition-all duration-200 ease-out',
          'pointer-events-none z-10'
        )}
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? refreshThreshold : 0)}px`,
          opacity: isRefreshing ? 1 : indicatorOpacity,
        }}
        aria-live="polite"
        aria-busy={isRefreshing}
      >
        <div className="flex items-center gap-2">
          {isRefreshing ? (
            <Loader2
              className="h-5 w-5 text-primary animate-spin"
              aria-label="Loading"
            />
          ) : (
            <RefreshCw
              className={cn(
                'h-5 w-5 text-primary transition-transform duration-200',
                shouldRelease && 'scale-110'
              )}
              style={{
                transform: `rotate(${indicatorRotation}deg)`,
              }}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'text-sm font-medium text-muted-foreground transition-colors',
              shouldRelease && !isRefreshing && 'text-primary'
            )}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'w-full h-full transition-transform',
          isPulling ? 'duration-0' : 'duration-300 ease-out'
        )}
        style={{
          transform: `translateY(${isRefreshing ? refreshThreshold : pullDistance}px)`,
          // Spring physics via cubic-bezier when releasing
          transitionTimingFunction: isPulling ? 'none' : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        data-scrollable
      >
        {children}
      </div>
    </div>
  );
}

/**
 * PullToRefreshContainer
 * Wrapper component that ensures proper scroll container setup
 */
export interface PullToRefreshContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PullToRefreshContainer({
  children,
  className,
}: PullToRefreshContainerProps) {
  return (
    <div
      className={cn('overflow-y-auto h-full', className)}
      data-scrollable
    >
      {children}
    </div>
  );
}

// Example Usage:
//
// import { PullToRefresh, PullToRefreshContainer } from '@/components/mobile/pull-to-refresh';
// import { useQuery } from '@tanstack/react-query';
//
// function ProductList() {
//   const { data, refetch } = useQuery({
//     queryKey: ['products'],
//     queryFn: fetchProducts,
//   });
//
//   const handleRefresh = async () => {
//     await refetch();
//   };
//
//   return (
//     <PullToRefresh
//       onRefresh={handleRefresh}
//       refreshThreshold={80}
//       pullingText="Pull to refresh products"
//       releaseText="Release to reload"
//       refreshingText="Loading products..."
//     >
//       <PullToRefreshContainer>
//         <div className="p-4 space-y-4">
//           {data?.map(product => (
//             <ProductCard key={product.id} product={product} />
//           ))}
//         </div>
//       </PullToRefreshContainer>
//     </PullToRefresh>
//   );
// }
//
// Usage with existing scrollable container:
//
// function OrderList() {
//   const handleRefresh = async () => {
//     await refetchOrders();
//   };
//
//   return (
//     <div className="h-screen flex flex-col">
//       <Header />
//       <PullToRefresh onRefresh={handleRefresh}>
//         <div className="overflow-y-auto flex-1" data-scrollable>
//           {orders.map(order => (
//             <OrderCard key={order.id} order={order} />
//           ))}
//         </div>
//       </PullToRefresh>
//     </div>
//   );
// }
