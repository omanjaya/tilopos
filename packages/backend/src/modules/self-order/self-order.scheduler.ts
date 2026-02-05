import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class SelfOrderScheduler {
  private readonly logger = new Logger(SelfOrderScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every 5 minutes to expire inactive self-order sessions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireSessions() {
    this.logger.log('Running session expiration job...');

    const now = new Date();

    // Find and expire all sessions that have passed their expiry time
    const result = await this.prisma.selfOrderSession.updateMany({
      where: {
        status: 'active',
        expiresAt: { lt: now },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} self-order sessions`);
    }
  }

  /**
   * Run every hour to clean up old expired sessions (older than 24 hours)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    // Delete items from expired sessions older than 24 hours
    const expiredSessions = await this.prisma.selfOrderSession.findMany({
      where: {
        status: 'expired',
        expiresAt: { lt: cutoffDate },
      },
      select: { id: true },
    });

    if (expiredSessions.length === 0) return;

    const sessionIds = expiredSessions.map((s) => s.id);

    // Delete items first (foreign key constraint)
    await this.prisma.selfOrderItem.deleteMany({
      where: { sessionId: { in: sessionIds } },
    });

    // Then delete the sessions
    const result = await this.prisma.selfOrderSession.deleteMany({
      where: { id: { in: sessionIds } },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old expired sessions`);
    }
  }

  /**
   * Manually expire a specific session
   */
  async expireSession(sessionCode: string) {
    return this.prisma.selfOrderSession.update({
      where: { sessionCode },
      data: { status: 'expired' },
    });
  }

  /**
   * Extend session expiry time
   */
  async extendSession(sessionCode: string, additionalMinutes: number = 30) {
    const session = await this.prisma.selfOrderSession.findUnique({
      where: { sessionCode },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const newExpiresAt = new Date(session.expiresAt);
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + additionalMinutes);

    return this.prisma.selfOrderSession.update({
      where: { sessionCode },
      data: { expiresAt: newExpiresAt },
    });
  }
}
