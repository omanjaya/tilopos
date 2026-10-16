import { useEffect, useState } from 'react';
import { restoreSession } from '@/api/session';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { OnboardingProvider } from '@/features/onboarding/onboarding-provider';
import { handleMutationError } from '@/lib/api-error-handler';
import { useAuthStore } from '@/stores/auth.store';
import { router } from './router';

const ONBOARDING_KEY = 'tilo_onboarding_completed';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Skip if mutation has its own onError handler
      if (mutation.options.onError) return;
      handleMutationError(error);
    },
  }),
});

// Drop every cached query when the session ends (logout, 401, expired token) so the
// next user on a shared terminal never sees the previous user's data (F4).
useAuthStore.subscribe((state, prev) => {
  if ((prev.isAuthenticated && !state.isAuthenticated) || prev.user?.id !== state.user?.id) {
    queryClient.clear();
  }
});

function getOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

function setOnboardingCompleted(completed: boolean): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, String(completed));
  } catch {
    // Ignore localStorage errors
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void restoreSession().finally(() => setReady(true));
    const reconnect = () => { void restoreSession(); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, []);
  if (!ready) return <div role="status">Memulihkan sesi…</div>;
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OnboardingProvider
          initialCompleted={getOnboardingCompleted()}
          onCompletedChange={setOnboardingCompleted}
        >
          <OfflineBanner />
          <RouterProvider router={router} />
          <Toaster />
        </OnboardingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
