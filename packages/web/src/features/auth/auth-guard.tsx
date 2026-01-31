import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isTokenExpired = useAuthStore((s) => s.isTokenExpired);
  const logout = useAuthStore((s) => s.logout);

  if (!isAuthenticated || isTokenExpired()) {
    if (isAuthenticated) {
      logout(); // Clean up expired session
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
