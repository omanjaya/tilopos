import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { selfOrderApi } from '@/api/endpoints/self-order.api';

const NOT_FOUND_CODES = new Set(['RESOURCE_NOT_FOUND', 'SESSION_EXPIRED']);

/** True when the server says the session doesn't exist / expired (vs. a transient failure). */
function isSessionMissing(error: unknown): boolean {
  if (!isAxiosError(error) || !error.response) return false;
  const { status, data } = error.response;
  if (status === 404 || status === 410) return true;
  const body = data as { code?: string; error?: { code?: string } } | undefined;
  const code = body?.code ?? body?.error?.code;
  return !!code && NOT_FOUND_CODES.has(code);
}

/**
 * Hook to fetch and manage self-order session data
 * @param sessionCode - The unique session code from URL params
 */
export function useSession(sessionCode: string | undefined) {
  const query = useQuery({
    queryKey: ['self-order-session', sessionCode],
    queryFn: () => selfOrderApi.getSession(sessionCode!),
    enabled: !!sessionCode,
    retry: (failureCount, error) => !isSessionMissing(error) && failureCount < 2,
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isNotFound: !sessionCode || (query.isError && isSessionMissing(query.error)),
    error: query.error,
    refetch: query.refetch,
  };
}
