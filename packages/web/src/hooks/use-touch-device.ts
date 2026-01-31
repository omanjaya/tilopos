import { useState, useEffect } from 'react';

interface TouchDeviceInfo {
  /** True if the device has touch capabilities */
  isTouchDevice: boolean;
  /** True if the device appears to be a tablet (touch + screen width 768-1024) */
  isTablet: boolean;
}

/**
 * Detect if the current device supports touch input and whether
 * the viewport size is in the tablet range (768px - 1024px).
 *
 * Uses a combination of `matchMedia`, `navigator.maxTouchPoints`,
 * and the legacy `ontouchstart` check.
 */
export function useTouchDevice(): TouchDeviceInfo {
  const [info, setInfo] = useState<TouchDeviceInfo>(() => detect());

  useEffect(() => {
    // Re-evaluate on resize so `isTablet` stays accurate when the user
    // rotates the device or resizes the browser.
    function handleChange() {
      setInfo(detect());
    }

    window.addEventListener('resize', handleChange);

    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleChange);

    return () => {
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
    };
  }, []);

  return info;
}

function detect(): TouchDeviceInfo {
  const hasTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches);

  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isTablet = hasTouch && width >= 768 && width <= 1024;

  return { isTouchDevice: hasTouch, isTablet };
}
