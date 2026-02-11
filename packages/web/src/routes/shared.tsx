import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// eslint-disable-next-line react-refresh/only-export-components
export function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}
