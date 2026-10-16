import { watchSocketSession } from './socket-session';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { Socket } from 'socket.io';

describe('live socket session revocation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('disconnects an existing connection when its session is revoked', async () => {
    const db = { authSession: { findFirst: jest.fn().mockResolvedValue(null) } };
    const client = { disconnect: jest.fn(), once: jest.fn() };
    watchSocketSession(
      db as unknown as PrismaService,
      {
        typ: 'access',
        sid: 's',
        sub: 'e',
        businessId: 'b',
        outletId: null,
        role: 'cashier',
        exp: Date.now() / 1000 + 100,
      },
      client as unknown as Socket,
    );
    await jest.advanceTimersByTimeAsync(30000);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
  it('disconnects at token expiry even if the family is still active', async () => {
    const db = { authSession: { findFirst: jest.fn().mockResolvedValue({ id: 's' }) } };
    const client = { disconnect: jest.fn(), once: jest.fn() };
    watchSocketSession(
      db as unknown as PrismaService,
      {
        typ: 'access',
        sid: 's',
        sub: 'e',
        businessId: 'b',
        outletId: null,
        role: 'cashier',
        exp: Date.now() / 1000 + 5,
      },
      client as unknown as Socket,
    );
    await jest.advanceTimersByTimeAsync(5000);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
