import { Link, useLocation } from 'react-router-dom';
import { ToggleLeft } from 'lucide-react';
import { useFeatureStore } from '@/stores/feature.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { canAccessPath } from '@/config/permissions';

interface FeatureGuardProps {
  children: React.ReactNode;
  /** Path to check against FEATURE_PATH_MAP (defaults to current location) */
  path?: string;
}

/**
 * Route-level guard for feature-flagged pages. When the feature controlling the
 * path is disabled it explains why instead of redirecting (a redirect to /app
 * can loop with the role-based home redirect, e.g. kitchen -> /kds).
 */
export function FeatureGuard({ children, path }: FeatureGuardProps) {
  const location = useLocation();
  const isPathVisible = useFeatureStore((s) => s.isPathVisible);
  const isLoaded = useFeatureStore((s) => s.isLoaded);
  const role = useAuthStore((s) => s.user?.role);

  // Show nothing while features are still loading to prevent flash of protected content
  if (!isLoaded) return null;

  const checkPath = path || location.pathname;
  if (!isPathVisible(checkPath)) {
    const canConfigure = canAccessPath(role, '/app/settings/features');
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <ToggleLeft className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Fitur belum aktif</h1>
          <p className="text-sm text-muted-foreground">
            {canConfigure
              ? 'Aktifkan fitur ini di Pengaturan > Fitur untuk menggunakan halaman ini.'
              : 'Fitur ini belum diaktifkan untuk bisnis atau outlet Anda. Hubungi pemilik atau manajer.'}
          </p>
        </div>
        {canConfigure && (
          <Button asChild variant="outline">
            <Link to="/app/settings/features">Buka Pengaturan Fitur</Link>
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
