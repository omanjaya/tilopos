import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { homePathForRole } from '@/config/permissions';

/**
 * /app index: render the dashboard only for roles that land on it; send
 * cashier/kitchen/inventory to their working screen (config/permissions.ts).
 */
export function HomeRoute({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  const home = homePathForRole(role);
  if (home !== '/app') return <Navigate to={home} replace />;
  return <>{children}</>;
}
