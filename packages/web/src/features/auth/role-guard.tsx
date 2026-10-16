import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { canAccessPath, homePathForRole } from '@/config/permissions';

interface RoleGuardProps {
  children: React.ReactNode;
  /** Path to check against ROUTE_ROLES; defaults to the current location. */
  path?: string;
}

/**
 * Route guard driven by ROUTE_ROLES in config/permissions.ts (single source,
 * mirrors backend @Roles). Shows an explicit "no access" page instead of a
 * silent redirect.
 */
export function RoleGuard({ children, path }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPath(user.role, path ?? location.pathname)) {
    return <ForbiddenPage homePath={homePathForRole(user.role)} />;
  }

  return <>{children}</>;
}

function ForbiddenPage({ homePath }: { homePath: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="text-sm text-muted-foreground">
          Peran Anda tidak memiliki izin untuk membuka halaman ini. Hubungi pemilik atau manajer
          bisnis jika Anda membutuhkan akses.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={homePath}>Kembali ke beranda</Link>
      </Button>
    </div>
  );
}
