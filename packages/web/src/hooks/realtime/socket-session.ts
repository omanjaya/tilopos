import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

/** Re-open a socket after the server expires or revokes its access credentials. */
export function recoverSocketSession(socket: Socket, isCurrent: () => boolean): void {
  if (!navigator.onLine || !useAuthStore.getState().isAuthenticated) return;
  void import('@/api/session')
    .then(async ({ refreshSession }) => {
      await refreshSession();
      if (isCurrent() && useAuthStore.getState().isAuthenticated) socket.connect();
    })
    .catch((error: unknown) => {
      console.warn(
        '[socket] could not recover session',
        error instanceof Error ? error.message : 'Session unavailable',
      );
    });
}
