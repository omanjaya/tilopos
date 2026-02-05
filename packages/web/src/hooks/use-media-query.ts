import { useState, useEffect } from 'react';

/**
 * useMediaQuery Hook
 *
 * Detects if a CSS media query matches the current viewport.
 * Useful for conditional rendering based on screen size.
 *
 * @param query - CSS media query string (e.g., '(max-width: 767px)')
 * @returns boolean - true if the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * if (isMobile) return <MobileView />;
 * return <DesktopView />;
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create listener for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener (use deprecated addListener for older browsers)
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Common breakpoint queries
 * Based on TiloPOS responsive design strategy
 */
export const BREAKPOINTS = {
  /** Mobile devices (< 768px) */
  mobile: '(max-width: 767px)',
  /** Tablet devices (768px - 1023px) */
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  /** Desktop devices (>= 1024px) */
  desktop: '(min-width: 1024px)',
  /** Tablet and above (>= 768px) */
  tabletUp: '(min-width: 768px)',
  /** Mobile and tablet (< 1024px) */
  mobileAndTablet: '(max-width: 1023px)',
} as const;

/**
 * Convenience hooks for common breakpoints
 */
export function useIsMobile(): boolean {
  return useMediaQuery(BREAKPOINTS.mobile);
}

export function useIsTablet(): boolean {
  return useMediaQuery(BREAKPOINTS.tablet);
}

export function useIsDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.desktop);
}
