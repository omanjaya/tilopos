import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Queue, Worker, type Job } from 'bullmq';
import { EventBusService } from './event-bus.service';
import { TransactionCreatedEvent } from '../../domain/events/transaction-created.event';
import { TransactionVoidedEvent } from '../../domain/events/transaction-voided.event';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';
import { redisConnectionOptions } from '../cache/redis-connection';
import { money } from '@shared/utils/money';
import { AUDIT_ACTIONS } from '@modules/audit/audit-actions';
import { addBusinessDays } from '@shared/utils/business-time';
import { computeLoyaltyPoints, tierForPoints } from '@application/services/loyalty-points';
import {
  DeductIngredientsOnSaleUseCase,
  type DeductIngredientsOutput,
} from '@application/use-cases/ingredients/deduct-ingredients-on-sale.use-case';

export const TRANSACTION_EFFECTS_QUEUE = 'transaction-effects';

type EffectJob =
  | { kind: 'created'; transactionId: string; outletId: string }
  | { kind: 'voided'; transactionId: string; outletId: string; reason: string };

/** Audit-log actions double as idempotency markers for the side effects. */
const CREATED_MARKER = AUDIT_ACTIONS.TRANSACTION_CREATED;
const VOID_MARKER = 'transaction_void_reversed';

/** Unpaid (credit) sales earn no loyalty points until they are paid. */
const NO_POINTS_STATUSES = new Set(['credit', 'partially_paid', 'pending']);

/**
 * Applies the side effects of sales and voids (ingredient stock, customer
 * stats, loyalty points, audit log) — R9/R11:
 * - every effect set runs in ONE $transaction under a per-transaction advisory
 *   lock and is recorded with an audit-log marker, so redelivery is a no-op;
 * - ingredient stock goes through DeductIngredientsOnSaleUseCase (the single, idempotent
 *   implementation; guarded decrements, shortfalls flagged on the movement) in the same tx;
 * - loyalty points are credited once per sale: the customer row is locked and an existing
 *   'earned' ledger row (e.g. from POST /loyalty/earn) makes the credit a no-op;
 * - customers are only touched when they belong to the sale's business;
 * - work goes through a BullMQ queue with retries/backoff, and permanently
 *   failed jobs stay in the queue's failed set (dead-letter) for inspection.
 */
@Injectable()
export class TransactionEventListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionEventListener.name);
  private queue?: Queue<EffectJob>;
  private worker?: Worker<EffectJob>;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly ingredients: DeductIngredientsOnSaleUseCase,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('NODE_ENV') !== 'test') {
      const connection = redisConnectionOptions(this.config);
      this.queue = new Queue<EffectJob>(TRANSACTION_EFFECTS_QUEUE, {
        connection,
        defaultJobOptions: {
          attempts: 8,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: false, // failed jobs are the dead-letter set
        },
      });
      this.worker = new Worker<EffectJob>(
        TRANSACTION_EFFECTS_QUEUE,
        (job: Job<EffectJob>) => this.process(job.data),
        { connection, concurrency: 5 },
      );
      this.worker.on('failed', (job, error) => {
        const final = job && job.attemptsMade >= (job.opts.attempts ?? 1);
        this.logger[final ? 'error' : 'warn'](
          `${final ? 'DEAD-LETTER' : 'Retrying'} transaction effect ${job?.id}: ${error.message}`,
        );
      });
    }

    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      void this.dispatch({
        kind: 'created',
        transactionId: event.transactionId,
        outletId: event.outletId,
      });
    });
    this.eventBus.ofType(TransactionVoidedEvent).subscribe((event) => {
      void this.dispatch({
        kind: 'voided',
        transactionId: event.transactionId,
        outletId: event.outletId,
        reason: event.reason,
      });
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  /** Enqueue (deduplicated by job id); if the queue is unavailable run inline. */
  async dispatch(job: EffectJob): Promise<void> {
    if (this.queue) {
      try {
        await this.queue.add(job.kind, job, { jobId: `${job.kind}:${job.transactionId}` });
        return;
      } catch (error) {
        this.logger.error(
          `Could not enqueue ${job.kind} effects for ${job.transactionId}, running inline: ${(error as Error).message}`,
        );
      }
    }
    try {
      await this.process(job);
    } catch (error) {
      this.logger.error(
        `Transaction ${job.kind} effects failed for ${job.transactionId} (no queue to retry): ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async process(job: EffectJob): Promise<void> {
    if (job.kind === 'created') {
      await this.applyCreated(job.transactionId);
    } else {
      await this.applyVoided(job.transactionId, job.reason);
    }
    await this.invalidateReportCache(job.outletId);
  }

  // ---------------------------------------------------------------------------
  // Sale created
  // ---------------------------------------------------------------------------

  async applyCreated(transactionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, transactionId);

      const txn = await tx.transaction.findUnique({
        where: { id: transactionId },
        select: {
          id: true,
          outletId: true,
          employeeId: true,
          customerId: true,
          status: true,
          transactionType: true,
          grandTotal: true,
          outlet: { select: { businessId: true } },
          items: { select: { productId: true, variantId: true, quantity: true } },
        },
      });
      if (!txn || txn.transactionType !== 'sale') return;
      if (await this.hasMarker(tx, transactionId, CREATED_MARKER)) return;
      // Voided before its effects ran: nothing to apply (and nothing to reverse later).
      if (txn.status === 'voided' || (await this.hasMarker(tx, transactionId, VOID_MARKER))) return;

      const businessId = txn.outlet.businessId;
      const usage = await this.ingredients.execute(
        {
          outletId: txn.outletId,
          transactionId: txn.id,
          employeeId: txn.employeeId,
          items: txn.items
            .filter((i): i is typeof i & { productId: string } => !!i.productId)
            .map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: Number(i.quantity),
            })),
        },
        tx,
      );
      this.logLowIngredients(txn.outletId, usage);
      const points = txn.customerId
        ? await this.creditCustomer(
            tx,
            businessId,
            txn.customerId,
            txn.id,
            txn.grandTotal,
            txn.status,
          )
        : 0;

      await tx.auditLog.create({
        data: {
          businessId,
          outletId: txn.outletId,
          employeeId: txn.employeeId,
          action: CREATED_MARKER,
          entityType: 'transaction',
          entityId: txn.id,
          newValue: {
            grandTotal: money(txn.grandTotal).toNumber(),
            transactionType: txn.transactionType,
            customerId: txn.customerId,
            loyaltyPoints: points,
          },
        },
      });
    });
  }

  /**
   * Customer stats + loyalty points, only for a customer of the sale's business.
   * Returns the points credited.
   */
  private async creditCustomer(
    tx: Prisma.TransactionClient,
    businessId: string,
    customerId: string,
    transactionId: string,
    grandTotal: Prisma.Decimal,
    status: string,
  ): Promise<number> {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, businessId },
      select: { id: true, isActive: true, loyaltyTier: true },
    });
    if (!customer) {
      this.logger.warn(`Customer ${customerId} is not in business ${businessId}; skipped`);
      return 0;
    }

    // Same lock as EarnLoyaltyPointsUseCase: a manual POST /loyalty/earn for this sale either
    // ran before (its 'earned' row exists and it already counted spend/visit) or waits for us.
    await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customer.id}::uuid FOR UPDATE`;
    const alreadyEarned = await tx.loyaltyTransaction.findFirst({
      where: { transactionId, type: 'earned' },
      select: { id: true },
    });
    if (alreadyEarned) {
      this.logger.log(`Loyalty for transaction ${transactionId} was already credited; skipped`);
      return 0;
    }

    // Stats are updated here and only here (credit sales included).
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalSpent: { increment: money(grandTotal) },
        visitCount: { increment: 1 },
        lastVisitAt: new Date(),
      },
    });

    if (!customer.isActive || NO_POINTS_STATUSES.has(status)) return 0;

    const program = await tx.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
      select: { amountPerPoint: true, pointExpiryDays: true },
    });
    if (!program) return 0;

    const tiers = await tx.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      select: { name: true, minPoints: true, pointMultiplier: true },
    });
    const current = tiers.find((t) => t.name === customer.loyaltyTier);
    const points = computeLoyaltyPoints(
      grandTotal,
      program.amountPerPoint,
      current?.pointMultiplier ?? 1,
    );
    if (points <= 0) return 0;

    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: { increment: points } },
      select: { loyaltyPoints: true, loyaltyTier: true },
    });
    await tx.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        transactionId,
        type: 'earned',
        points,
        balanceAfter: updated.loyaltyPoints,
        description: 'Earned from transaction',
        expiresAt: program.pointExpiryDays
          ? addBusinessDays(new Date(), program.pointExpiryDays)
          : null,
      },
    });
    await this.syncTier(tx, customer.id, updated.loyaltyPoints, updated.loyaltyTier, tiers);
    return points;
  }

  // ---------------------------------------------------------------------------
  // Sale voided
  // ---------------------------------------------------------------------------

  async applyVoided(transactionId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, transactionId);

      const txn = await tx.transaction.findUnique({
        where: { id: transactionId },
        select: {
          id: true,
          outletId: true,
          voidedBy: true,
          customerId: true,
          grandTotal: true,
          transactionType: true,
          outlet: { select: { businessId: true } },
        },
      });
      if (!txn || txn.transactionType !== 'sale') return;
      if (await this.hasMarker(tx, transactionId, VOID_MARKER)) return;

      const businessId = txn.outlet.businessId;
      const applied = await this.hasMarker(tx, transactionId, CREATED_MARKER);
      if (applied) {
        // Reverses exactly the usage recorded for this sale (not today's recipe), once.
        await this.ingredients.restore(
          {
            outletId: txn.outletId,
            transactionId,
            employeeId: txn.voidedBy,
            reason,
          },
          tx,
        );

        if (txn.customerId) {
          await this.reverseCustomer(
            tx,
            businessId,
            txn.customerId,
            transactionId,
            txn.grandTotal,
            reason,
          );
        }
      }

      await tx.auditLog.create({
        data: {
          businessId,
          outletId: txn.outletId,
          employeeId: txn.voidedBy,
          action: VOID_MARKER,
          entityType: 'transaction',
          entityId: transactionId,
          newValue: { reason, effectsReversed: applied },
        },
      });
    });
  }

  private async reverseCustomer(
    tx: Prisma.TransactionClient,
    businessId: string,
    customerId: string,
    transactionId: string,
    grandTotal: Prisma.Decimal,
    reason: string,
  ): Promise<void> {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, businessId },
      select: { id: true, loyaltyPoints: true, totalSpent: true, visitCount: true },
    });
    if (!customer) return;

    const earned = await tx.loyaltyTransaction.findFirst({
      where: { transactionId, customerId, type: 'earned' },
      select: { points: true },
    });
    // Never drive balances below zero.
    const points = Math.min(earned?.points ?? 0, Math.max(customer.loyaltyPoints, 0));
    const spent = Prisma.Decimal.min(money(grandTotal), money(customer.totalSpent));

    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: { decrement: points },
        totalSpent: { decrement: spent },
        visitCount: { decrement: customer.visitCount > 0 ? 1 : 0 },
      },
      select: { loyaltyPoints: true, loyaltyTier: true },
    });

    if (points > 0) {
      await tx.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          transactionId,
          type: 'reversed',
          points: -points,
          balanceAfter: updated.loyaltyPoints,
          description: `Reversed: transaction voided (${reason})`,
        },
      });
    }

    const tiers = await tx.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      select: { name: true, minPoints: true },
    });
    await this.syncTier(tx, customer.id, updated.loyaltyPoints, updated.loyaltyTier, tiers);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Serialises all effect processing of one transaction (created vs voided, retries). */
  private async lock(tx: Prisma.TransactionClient, transactionId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`txn-effects:${transactionId}`}))`;
  }

  private async hasMarker(
    tx: Prisma.TransactionClient,
    transactionId: string,
    action: string,
  ): Promise<boolean> {
    const count = await tx.auditLog.count({
      where: { entityType: 'transaction', entityId: transactionId, action },
    });
    return count > 0;
  }

  private logLowIngredients(outletId: string, usage: DeductIngredientsOutput): void {
    for (const d of usage.deductions) {
      if (d.insufficientStock) {
        this.logger.warn(
          `Insufficient ingredient ${d.ingredientId} at outlet ${outletId}: deducted ${d.quantityDeducted}, stock now ${d.remainingStock}`,
        );
      } else if (d.isBelowAlert) {
        this.logger.warn(
          `Low ingredient stock ${d.ingredientId} at outlet ${outletId}: ${d.remainingStock}`,
        );
      }
    }
  }

  private async syncTier(
    tx: Prisma.TransactionClient,
    customerId: string,
    points: number,
    currentTier: string,
    tiers: Array<{ name: string; minPoints: number }>,
  ): Promise<void> {
    const target = tierForPoints(tiers, points);
    if (target && target.name !== currentTier) {
      await tx.customer.update({ where: { id: customerId }, data: { loyaltyTier: target.name } });
      this.logger.log(`Customer ${customerId} moved to tier ${target.name}`);
    }
  }

  /** Best effort: stale caches expire on their own TTL. */
  private async invalidateReportCache(outletId: string): Promise<void> {
    try {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { businessId: true },
      });
      const businessId = outlet?.businessId;
      await Promise.all([
        this.redis.invalidatePattern(`report:*:${outletId}:*`),
        this.redis.invalidatePattern(`report:dashboard:*:${outletId}:*`),
        ...(businessId
          ? [
              this.redis.invalidatePattern(`staff:leaderboard:${businessId}:*`),
              this.redis.invalidatePattern(`report:dashboard:outlet-comparison:${businessId}:*`),
              this.redis.invalidatePattern(`owner:analytics:*:${businessId}:*`),
              this.redis.invalidatePattern(`financial:*:${businessId}:*`),
            ]
          : []),
      ]);
    } catch (error) {
      // intentionally ignored: cache entries expire by TTL; the effects themselves are committed.
      this.logger.warn(
        `Report cache invalidation failed for outlet ${outletId}: ${(error as Error).message}`,
      );
    }
  }
}
