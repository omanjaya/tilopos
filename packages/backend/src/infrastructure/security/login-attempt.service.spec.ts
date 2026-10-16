import { HttpException } from '@nestjs/common';
import type { RedisService } from '@infrastructure/cache/redis.service';
import {
  BASE_LOCKOUT_SECONDS,
  LoginAttemptService,
  MAX_FAILED_ATTEMPTS,
} from './login-attempt.service';

/** Minimal in-memory Redis stand-in (TTL ignored except for lock expiry via value). */
function fakeRedis() {
  const store = new Map<string, unknown>();
  const redis = {
    get: jest.fn(async (k: string) => (store.has(k) ? store.get(k) : null)),
    set: jest.fn(async (k: string, v: unknown, _ttl?: number) => {
      store.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    exists: jest.fn(async (k: string) => store.has(k)),
    increment: jest.fn(async (k: string) => {
      const n = Number(store.get(k) ?? 0) + 1;
      store.set(k, n);
      return n;
    }),
    expire: jest.fn(async () => undefined),
  };
  return { redis, store };
}

describe('LoginAttemptService', () => {
  it('locks the account after MAX_FAILED_ATTEMPTS failures and unlocks on reset', async () => {
    const { redis } = fakeRedis();
    const svc = new LoginAttemptService(redis as unknown as RedisService);

    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
      await svc.recordFailure('pin', 'User@Example.com');
    }
    await expect(svc.assertNotLocked('pin', 'user@example.com')).resolves.toBeUndefined();

    await svc.recordFailure('pin', 'user@example.com');
    await expect(svc.assertNotLocked('pin', 'USER@example.com')).rejects.toBeInstanceOf(
      HttpException,
    );
    const lockCall = redis.set.mock.calls.find(([k]) => String(k).startsWith('auth:lock:pin:'));
    expect(lockCall?.[2]).toBe(BASE_LOCKOUT_SECONDS);

    await svc.reset('pin', 'user@example.com');
    await expect(svc.assertNotLocked('pin', 'user@example.com')).resolves.toBeUndefined();
  });

  it('doubles the lockout on repeated lockouts', async () => {
    const { redis } = fakeRedis();
    const svc = new LoginAttemptService(redis as unknown as RedisService);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS * 2; i++) {
      await svc.recordFailure('mfa', 'emp-1');
    }
    const lockTtls = redis.set.mock.calls
      .filter(([k]) => String(k).startsWith('auth:lock:mfa:'))
      .map(([, , ttl]) => ttl);
    expect(lockTtls).toEqual([BASE_LOCKOUT_SECONDS, BASE_LOCKOUT_SECONDS * 2]);
  });

  it('keeps scopes separate', async () => {
    const { redis } = fakeRedis();
    const svc = new LoginAttemptService(redis as unknown as RedisService);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await svc.recordFailure('mfa', 'emp-1');
    }
    await expect(svc.assertNotLocked('change_pin', 'emp-1')).resolves.toBeUndefined();
  });

  it('fails open when Redis is down', async () => {
    const { redis } = fakeRedis();
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const svc = new LoginAttemptService(redis as unknown as RedisService);
    await expect(svc.assertNotLocked('pin', 'a@b.c')).resolves.toBeUndefined();
  });

  it('detects one-time code replay', async () => {
    const { redis } = fakeRedis();
    const svc = new LoginAttemptService(redis as unknown as RedisService);
    await expect(svc.markCodeUsed('emp-1', '123456', 120)).resolves.toBe(true);
    await expect(svc.markCodeUsed('emp-1', '123456', 120)).resolves.toBe(false);
    await expect(svc.markCodeUsed('emp-2', '123456', 120)).resolves.toBe(true);
  });
});
