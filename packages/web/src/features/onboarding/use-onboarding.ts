import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    select: (data) => data.onboardingCompleted ?? false,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  const mutation = useMutation({
    mutationFn: () => authApi.completeOnboarding(),
    onSuccess: async () => {
      // Invalidate and refetch user data to get updated onboardingCompleted status
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });

      // Update user in auth store
      const updatedUser = await authApi.getMe();
      updateUser(updatedUser);
    },
  });

  return {
    completeOnboarding: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
