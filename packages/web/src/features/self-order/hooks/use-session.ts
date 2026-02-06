import { useQuery } from '@tanstack/react-query';
import { selfOrderApi } from '@/api/endpoints/self-order.api';

/**
 * Hook to fetch and manage self-order session data
 * @param sessionCode - The unique session code from URL params
 * @returns Query result with session data and loading state
 */
export function useSession(sessionCode: string | undefined) {
  const query = useQuery({
    queryKey: ['self-order-session', sessionCode],
    queryFn: () => selfOrderApi.getSession(sessionCode!),
    enabled: !!sessionCode,
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
