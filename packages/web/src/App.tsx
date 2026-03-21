import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { OnboardingProvider } from '@/features/onboarding/onboarding-provider';
import { handleMutationError } from '@/lib/api-error-handler';
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
