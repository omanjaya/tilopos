import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useFeatureStore } from '@/stores/feature.store';
import { isNavPathAllowed } from './sidebar-nav-data';

/**
 * Returns a predicate telling whether a navigation target should be offered to
 * the current user: allowed by ROUTE_ROLES (config/permissions.ts) and enabled
 * by the business/outlet feature flags. Shared by sidebar, mobile nav and the
 * command palette so every menu hides the same things.
 */
export function useNavVisibility(): (path: string) => boolean {
  const role = useAuthStore((s) => s.user?.role);
  const isPathVisible = useFeatureStore((s) => s.isPathVisible);
  // Subscribe to feature inputs so callers re-render when features load.
  const enabledFeatures = useFeatureStore((s) => s.enabledFeatures);
  const restrictedFeatures = useFeatureStore((s) => s.restrictedFeatures);
  const featuresLoaded = useFeatureStore((s) => s.isLoaded);

  return useCallback(
    (path: string) => {
      const clean = path.split(/[?#]/)[0] ?? path;
      return isNavPathAllowed(role, clean) && isPathVisible(clean);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feature inputs change isPathVisible's result
    [role, isPathVisible, enabledFeatures, restrictedFeatures, featuresLoaded],
  );
}
