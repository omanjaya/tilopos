import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Access-token expiry is recovered by the API client. Offline checkout keeps
  // its operator identity even while a fresh server token is unavailable.
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
