import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth.api';

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    select: (data) => data.onboardingCompleted ?? false,
  });
}

export function useCompleteOnboarding() {
  // This will be implemented when the API endpoint is ready
  const completeOnboarding = async () => {
    // TODO: Call API to mark onboarding as complete
    // await authApi.completeOnboarding();
    localStorage.setItem('tilo-onboarding-completed', 'true');
  };

  return { completeOnboarding };
}
