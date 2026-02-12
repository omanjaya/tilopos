import { Navigate, useLocation } from 'react-router-dom';
import { useFeatureStore } from '@/stores/feature.store';

interface FeatureGuardProps {
  children: React.ReactNode;
  /** Path to check against FEATURE_PATH_MAP (defaults to current location) */
  path?: string;
}

/**
 * Route-level guard that redirects to /app when the feature
 * controlling the current path is disabled.
 */
export function FeatureGuard({ children, path }: FeatureGuardProps) {
  const location = useLocation();
  const isPathVisible = useFeatureStore((s) => s.isPathVisible);
  const isLoaded = useFeatureStore((s) => s.isLoaded);

  // Don't block while features are still loading
  if (!isLoaded) return <>{children}</>;

  const checkPath = path || location.pathname;
  if (!isPathVisible(checkPath)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
