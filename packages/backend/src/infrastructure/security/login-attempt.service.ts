import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';

/** Kinds of secret a client can guess; each has its own counter per account. */
export type AttemptScope = 'pin' | 'mfa' | 'change_pin';

/** Failures allowed before the account is locked for this scope. */
export const MAX_FAILED_ATTEMPTS = 5;
/** Window in which failures are counted. */
export const FAILURE_WINDOW_SECONDS = 15 * 60;
/** First lockout; doubles with every further lockout inside the window, capped. */
export const BASE_LOCKOUT_SECONDS = 60;
export const MAX_LOCKOUT_SECONDS = 60 * 60;

/**
 * Per-account brute-force protection for PIN and TOTP checks
 * (independent of the client IP, which an attacker can rotate).
 *
 * After MAX_FAILED_ATTEMPTS failures the account is locked for an
 * exponentially growing period. A success clears the counters.
 * If Redis is unavailable the check fails open (logged), so an outage of
 * the cache never locks every user out; IP throttling still applies.
 */
@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);

  constructor(private readonly redis: RedisService) {}

  /** Throws 429 while the account is locked for this scope. */
  async assertNotLocked(scope: AttemptScope, account: string): Promise<void> {
    let lockedFor = 0;
    try {
      const until = await this.redis.get<number>(this.lockKey(scope, account));
      if (until) {
        lockedFor = Math.ceil((Number(until) - Date.now()) / 1000);
      }
    } catch (error) {
      this.logger.warn(`Lockout check unavailable (${scope}): ${(error as Error).message}`);
      return;
    }
    if (lockedFor > 0) {
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${lockedFor} detik.`,
          details: { retryAfterSeconds: lockedFor },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Records a failed attempt and locks the account once the limit is hit. */
  async recordFailure(scope: AttemptScope, account: string): Promise<void> {
    try {
      const failKey = this.failKey(scope, account);
      const failures = await this.redis.increment(failKey);
      if (failures === 1) {
        await this.redis.expire(failKey, FAILURE_WINDOW_SECONDS);
      }
      if (failures >= MAX_FAILED_ATTEMPTS && failures % MAX_FAILED_ATTEMPTS === 0) {
        const lockouts = failures / MAX_FAILED_ATTEMPTS;
        const seconds = Math.min(BASE_LOCKOUT_SECONDS * 2 ** (lockouts - 1), MAX_LOCKOUT_SECONDS);
        await this.redis.set(this.lockKey(scope, account), Date.now() + seconds * 1000, seconds);
        // Keep counting across lockouts so the backoff keeps growing.
        await this.redis.expire(failKey, Math.max(FAILURE_WINDOW_SECONDS, seconds * 2));
        this.logger.warn(
          `Account locked (${scope}) after ${failures} failed attempts for ${seconds}s: ${account}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Could not record failed attempt (${scope}): ${(error as Error).message}`);
    }
  }

  /** Clears counters after a successful check. */
  async reset(scope: AttemptScope, account: string): Promise<void> {
    try {
      await this.redis.del(this.failKey(scope, account));
      await this.redis.del(this.lockKey(scope, account));
    } catch (error) {
      this.logger.warn(`Could not reset attempts (${scope}): ${(error as Error).message}`);
    }
  }

  /**
   * Marks a one-time code as used for this account. Returns false when it
   * was already used (replay).
   */
  async markCodeUsed(account: string, code: string, ttlSeconds: number): Promise<boolean> {
    const key = `auth:used-code:${account}:${code}`;
    try {
      if (await this.redis.exists(key)) {
        return false;
      }
      await this.redis.set(key, 1, ttlSeconds);
    } catch (error) {
      this.logger.warn(`Replay check unavailable: ${(error as Error).message}`);
    }
    return true;
  }

  private failKey(scope: AttemptScope, account: string): string {
    return `auth:fail:${scope}:${account.toLowerCase()}`;
  }

  private lockKey(scope: AttemptScope, account: string): string {
    return `auth:lock:${scope}:${account.toLowerCase()}`;
  }
}
