import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';
import { BUSINESS_TZ } from '@shared/utils/business-time';
import { AppError, ErrorCode } from '@shared/errors/app-error';

/** A session can never live longer than this from creation, however often it is extended. */
export const SELF_ORDER_MAX_LIFETIME_MS = 6 * 60 * 60 * 1000;
const DEFAULT_EXTEND_MINUTES = 30;
const CLEANUP_BATCH = 1000;

@Injectable()
export class SelfOrderScheduler {
  private readonly logger = new Logger(SelfOrderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locks: DistributedLockService,
  ) {}

  /** Every 5 minutes: expire active sessions past their expiry time. */
  @Cron(CronExpression.EVERY_5_MINUTES, { timeZone: BUSINESS_TZ })
  async expireSessions(): Promise<void> {
    await this.locks.runExclusive('self-order:expire-sessions', 240, async () => {
      const result = await this.prisma.selfOrderSession.updateMany({
        where: { status: 'active', expiresAt: { lt: new Date() } },
        data: { status: 'expired' },
      });
      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} self-order sessions`);
      }
    });
  }

  /** Hourly: delete expired sessions older than 24 hours (items cascade). */
  @Cron(CronExpression.EVERY_HOUR, { timeZone: BUSINESS_TZ })
  async cleanupExpiredSessions(): Promise<void> {
    await this.locks.runExclusive('self-order:cleanup-sessions', 1800, async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const expired = await this.prisma.selfOrderSession.findMany({
        where: { status: 'expired', expiresAt: { lt: cutoff } },
        select: { id: true },
        take: CLEANUP_BATCH,
      });
      if (expired.length === 0) return;
      const ids = expired.map((s) => s.id);

      const [, sessions] = await this.prisma.$transaction([
        this.prisma.selfOrderItem.deleteMany({ where: { sessionId: { in: ids } } }),
        this.prisma.selfOrderSession.deleteMany({ where: { id: { in: ids }, status: 'expired' } }),
      ]);
      if (sessions.count > 0) {
        this.logger.log(`Cleaned up ${sessions.count} old expired sessions`);
      }
    });
  }

  /**
   * Extends an ACTIVE session. The new expiry is based on max(now, expiresAt)
   * and capped at createdAt + SELF_ORDER_MAX_LIFETIME_MS.
   */
  async extendSession(sessionCode: string, additionalMinutes: number = DEFAULT_EXTEND_MINUTES) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode },
      select: { id: true, status: true, expiresAt: true, createdAt: true },
    });
    if (!session) {
      throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', HttpStatus.NOT_FOUND);
    }
    const now = Date.now();
    if (session.status !== 'active' || session.expiresAt.getTime() < now) {
      throw new AppError(
        ErrorCode.SESSION_EXPIRED,
        'Only active sessions can be extended',
        HttpStatus.CONFLICT,
      );
    }

    const maxExpiry = session.createdAt.getTime() + SELF_ORDER_MAX_LIFETIME_MS;
    const requested = Math.max(now, session.expiresAt.getTime()) + additionalMinutes * 60_000;
    const expiresAt = new Date(Math.min(requested, maxExpiry));
    if (expiresAt.getTime() <= session.expiresAt.getTime()) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Session has reached its maximum lifetime',
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.selfOrderSession.updateMany({
      where: { id: session.id, status: 'active' },
      data: { expiresAt },
    });
    if (updated.count !== 1) {
      throw new AppError(
        ErrorCode.SESSION_EXPIRED,
        'Session is no longer active',
        HttpStatus.CONFLICT,
      );
    }
    return { sessionCode, status: 'active', expiresAt };
  }
}
