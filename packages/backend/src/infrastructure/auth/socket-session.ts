import type { Socket } from 'socket.io';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { AccessTokenPayload } from './access-token';
import { assertSessionActive } from './session-access';

/** Existing sockets must not keep receiving tenant events after revocation. */
export function watchSocketSession(
  prisma: PrismaService,
  payload: AccessTokenPayload,
  client: Socket,
): void {
  const expiresIn = (payload.exp ?? 0) * 1000 - Date.now();
  const close = () => {
    clearInterval(check);
    clearTimeout(expiry);
    client.disconnect(true);
  };
  let checking = false;
  const check = setInterval(() => {
    if (checking) return;
    checking = true;
    void assertSessionActive(prisma, payload)
      .catch(close)
      .finally(() => {
        checking = false;
      });
  }, 30000);
  const expiry = setTimeout(close, Math.max(0, expiresIn));
  check.unref();
  expiry.unref();
  client.once('disconnect', () => {
    clearInterval(check);
    clearTimeout(expiry);
  });
}
