import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui.store';
import { applyBrandTheme, removeBrandTheme, isValidHex } from '@/lib/color-utils';

/**
 * Applies the user's brand color as CSS custom property overrides.
 * Call once in AppLayout — it reacts to theme and brandColor changes.
 */
export function useBrandTheme() {
  const theme = useUIStore((s) => s.theme);
  const brandColor = useUIStore((s) => s.brandColor);

  useEffect(() => {
    if (brandColor && isValidHex(brandColor)) {
      applyBrandTheme(brandColor, theme === 'dark');
    } else {
      removeBrandTheme();
    }
  }, [brandColor, theme]);
}
