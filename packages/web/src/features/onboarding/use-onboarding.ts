import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { meToAuthUser } from '@/features/auth/auth-user';

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  const mutation = useMutation({
    mutationFn: () => authApi.completeOnboarding(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      const me = await authApi.getMe();
      updateUser(meToAuthUser(me, useAuthStore.getState().user));
    },
  });

  return {
    completeOnboarding: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
