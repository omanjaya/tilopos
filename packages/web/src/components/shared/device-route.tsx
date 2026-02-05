import { ComponentType, Suspense } from 'react';
import { useMediaQuery, BREAKPOINTS } from '@/hooks/use-media-query';
import { LoadingSpinner } from './loading-spinner';

/**
 * DeviceRoute Component
 *
 * Conditionally renders different components based on device type.
 * Used in router to switch between desktop and mobile file versions.
 *
 * Supports lazy-loaded components with automatic suspense fallback.
 *
 * @example
 * ```tsx
 * // In router.tsx
 * const ProductsPage = lazy(() => import('./products-page'));
 * const ProductsPageMobile = lazy(() => import('./products-page.mobile'));
 *
 * {
 *   path: '/app/products',
 *   element: <DeviceRoute desktop={ProductsPage} mobile={ProductsPageMobile} />
 * }
 * ```
 */

interface DeviceRouteProps {
  /** Component to render on desktop (>= 1024px) */
  desktop: ComponentType;
  /** Component to render on mobile (< 768px) */
  mobile: ComponentType;
  /** Optional component to render on tablet (768px - 1023px). Defaults to desktop. */
  tablet?: ComponentType;
  /** Custom loading fallback. Defaults to LoadingSpinner. */
  fallback?: React.ReactNode;
}

export function DeviceRoute({
  desktop: Desktop,
  mobile: Mobile,
  tablet: Tablet,
  fallback = <LoadingSpinner />,
}: DeviceRouteProps) {
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);

  // Determine which component to render
  let Component: ComponentType;

  if (isMobile) {
    Component = Mobile;
  } else if (isTablet && Tablet) {
    Component = Tablet;
  } else {
    Component = Desktop;
  }

  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}

/**
 * Simple device-based conditional rendering
 * Use when you need to render different content inline
 *
 * @example
 * ```tsx
 * <ShowOn mobile>
 *   <MobileNavigation />
 * </ShowOn>
 * <ShowOn desktop>
 *   <DesktopSidebar />
 * </ShowOn>
 * ```
 */
interface ShowOnProps {
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
  children: React.ReactNode;
}

export function ShowOn({ mobile, tablet, desktop, children }: ShowOnProps) {
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const isDesktop = useMediaQuery(BREAKPOINTS.desktop);

  const shouldShow =
    (mobile && isMobile) ||
    (tablet && isTablet) ||
    (desktop && isDesktop);

  if (!shouldShow) return null;

  return <>{children}</>;
}
