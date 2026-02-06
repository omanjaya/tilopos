/**
 * Self-Order Session Service
 *
 * Responsibilities:
 * - Create new self-order sessions (QR code scans)
 * - Retrieve session information
 * - Expire old sessions (cleanup)
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SelfOrderSessionInfo } from '../types/self-order.types';
import { randomBytes } from 'crypto';

@Injectable()
export class SelfOrderSessionService {
  private readonly logger = new Logger(SelfOrderSessionService.name);
  private readonly SESSION_EXPIRY_MINUTES = 60;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new self-order session (when customer scans QR)
   */
  async createSession(outletId: string, tableId?: string): Promise<SelfOrderSessionInfo> {
    const sessionCode = randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.SESSION_EXPIRY_MINUTES);

    const table = tableId ? await this.prisma.table.findUnique({ where: { id: tableId } }) : null;

    const session = await this.prisma.selfOrderSession.create({
      data: {
        outletId,
        tableId,
        sessionCode,
        status: 'active',
        expiresAt,
      },
    });

    return {
      id: session.id,
      outletId: session.outletId,
      tableId: session.tableId || undefined,
      tableName: table?.name,
      sessionCode: session.sessionCode,
      status: session.status,
      customerName: session.customerName || undefined,
      language: session.language,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      items: [],
    };
  }

  /**
   * Get session by session code
   */
  async getSession(sessionCode: string): Promise<SelfOrderSessionInfo> {
    const session = await this.prisma.selfOrderSession.findFirst({
      where: { sessionCode },
      include: {
        table: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'active') {
      throw new BadRequestException('Session is no longer active');
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.selfOrderSession.update({
        where: { id: session.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Session has expired');
    }

    return {
      id: session.id,
      outletId: session.outletId,
      tableId: session.tableId || undefined,
      tableName: session.table?.name,
      sessionCode: session.sessionCode,
      status: session.status,
      customerName: session.customerName || undefined,
      language: session.language,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      items: session.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.product.name,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unitPrice: Number(item.variant?.price ?? item.product.basePrice),
        modifiers: item.modifiers as unknown as SelfOrderSessionInfo['items'][0]['modifiers'],
        notes: item.notes || undefined,
        subtotal: Number(item.variant?.price ?? item.product.basePrice) * item.quantity,
      })),
    };
  }

  /**
   * Expire all sessions older than SESSION_EXPIRY_MINUTES.
   * Should be called periodically (e.g., via a cron job).
   */
  async expireOldSessions(): Promise<{ expired: number }> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - this.SESSION_EXPIRY_MINUTES);

    const result = await this.prisma.selfOrderSession.updateMany({
      where: {
        status: 'active',
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} old self-order sessions`);
    }

    return { expired: result.count };
  }
}
