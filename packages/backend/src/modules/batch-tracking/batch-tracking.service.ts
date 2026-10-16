import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '@shared/tenant';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';
import {
  BUSINESS_TZ,
  addBusinessDays,
  endOfBusinessDay,
  startOfBusinessDay,
} from '@shared/utils/business-time';
import type { CreateBatchLotDto, UpdateBatchLotDto } from '@application/dtos/batch-lot.dto';

export interface BatchDeductionResult {
  deducted: number;
  batches: { batchId: string; batchNumber: string; deducted: number; remaining: number }[];
}

type Caller = Pick<AuthUser, 'businessId'>;

/** Upper bound for list responses (R13). */
const MAX_BATCH_ROWS = 500;
const FIFO_ORDER: Prisma.BatchLotOrderByWithRelationInput[] = [
  { expiresAt: 'asc' },
  { receivedAt: 'asc' },
];

/**
 * Batch/lot ledger with expiry. NOTE: batch quantities are an expiry/lot ledger kept
 * alongside stock_levels; they are not (yet) synchronised with sales or stock
 * adjustments (see F0762). FIFO deduction must be triggered explicitly.
 *
 * Every read/write is scoped to the caller's business via `outlet.businessId` (R3).
 */
@Injectable()
export class BatchTrackingService {
  private readonly logger = new Logger(BatchTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly locks: DistributedLockService,
  ) {}

  private scope(user: Caller) {
    return { outlet: { businessId: user.businessId } };
  }

  /** Product and outlet must both belong to the caller's business. */
  private async assertProductOutlet(user: Caller, productId: string, outletId: string) {
    await this.tenant.assertOutlet(user, outletId);
    await this.tenant.assertOwned('product', productId, user.businessId);
  }

  async findById(user: Caller, id: string) {
    const batch = await this.prisma.batchLot.findFirst({ where: { id, ...this.scope(user) } });
    if (!batch) throw new NotFoundException('Batch lot not found');
    return batch;
  }

  async listByProduct(user: Caller, productId: string, outletId: string) {
    await this.assertProductOutlet(user, productId, outletId);
    return this.prisma.batchLot.findMany({
      where: { productId, outletId },
      orderBy: FIFO_ORDER,
      take: MAX_BATCH_ROWS,
    });
  }

  async listActive(user: Caller, productId: string, outletId: string) {
    await this.assertProductOutlet(user, productId, outletId);
    return this.prisma.batchLot.findMany({
      where: { productId, outletId, status: 'active', quantity: { gt: 0 } },
      orderBy: FIFO_ORDER,
      take: MAX_BATCH_ROWS,
    });
  }

  async create(user: Caller, dto: CreateBatchLotDto) {
    await this.assertProductOutlet(user, dto.productId, dto.outletId);
    try {
      return await this.prisma.batchLot.create({
        data: {
          productId: dto.productId,
          outletId: dto.outletId,
          batchNumber: dto.batchNumber,
          quantity: new Prisma.Decimal(dto.quantity),
          costPrice: dto.costPrice !== undefined ? new Prisma.Decimal(dto.costPrice) : null,
          manufacturedAt: dto.manufacturedAt ? new Date(dto.manufacturedAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          notes: dto.notes ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Batch number ${dto.batchNumber} already exists`);
      }
      throw err;
    }
  }

  async update(user: Caller, id: string, dto: UpdateBatchLotDto) {
    const data: Prisma.BatchLotUpdateManyMutationInput = {};
    if (dto.quantity !== undefined) data.quantity = new Prisma.Decimal(dto.quantity);
    if (dto.costPrice !== undefined) data.costPrice = new Prisma.Decimal(dto.costPrice);
    if (dto.expiresAt !== undefined)
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;

    const result = await this.prisma.batchLot.updateMany({
      where: { id, ...this.scope(user) },
      data,
    });
    if (result.count === 0) throw new NotFoundException('Batch lot not found');
    return this.findById(user, id);
  }

  async delete(user: Caller, id: string) {
    const result = await this.prisma.batchLot.deleteMany({ where: { id, ...this.scope(user) } });
    if (result.count === 0) throw new NotFoundException('Batch lot not found');
  }

  /**
   * FIFO deduction from the soonest-to-expire / oldest batches. Runs in one transaction;
   * each batch is decremented with a conditional update (`quantity >= n`), so two
   * concurrent deductions can never spend the same units. If a batch changed under us
   * the whole deduction is rejected with 409 and the caller can retry.
   */
  async deductFIFO(
    user: Caller,
    productId: string,
    outletId: string,
    quantityToDeduct: number,
  ): Promise<BatchDeductionResult> {
    await this.assertProductOutlet(user, productId, outletId);

    return this.prisma.$transaction(async (tx) => {
      const batches = await tx.batchLot.findMany({
        where: { productId, outletId, status: 'active', quantity: { gt: 0 } },
        orderBy: FIFO_ORDER,
        take: MAX_BATCH_ROWS,
      });

      let remaining = new Prisma.Decimal(quantityToDeduct);
      const deductions: BatchDeductionResult['batches'] = [];

      for (const batch of batches) {
        if (remaining.lte(0)) break;
        const available = new Prisma.Decimal(batch.quantity);
        const take = Prisma.Decimal.min(available, remaining);

        const updated = await tx.batchLot.updateMany({
          where: { id: batch.id, status: 'active', quantity: { gte: take } },
          data: { quantity: { decrement: take } },
        });
        if (updated.count === 0) {
          throw new ConflictException('Batch stock changed concurrently, please retry');
        }
        const left = available.minus(take);
        if (left.lte(0)) {
          await tx.batchLot.updateMany({
            where: { id: batch.id, quantity: { lte: 0 } },
            data: { status: 'depleted' },
          });
        }

        deductions.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          deducted: take.toNumber(),
          remaining: left.toNumber(),
        });
        remaining = remaining.minus(take);
      }

      if (remaining.gt(0)) {
        this.logger.warn(
          `Insufficient batch stock for product ${productId}: needed ${quantityToDeduct}, short by ${remaining.toString()}`,
        );
      }

      return {
        deducted: new Prisma.Decimal(quantityToDeduct).minus(remaining).toNumber(),
        batches: deductions,
      };
    });
  }

  /** Active batches expiring up to the end of the business day `daysAhead` days from now. */
  async getExpiringBatches(user: Caller, outletId: string, daysAhead = 7) {
    await this.tenant.assertOutlet(user, outletId);
    const until = endOfBusinessDay(addBusinessDays(new Date(), daysAhead));

    return this.prisma.batchLot.findMany({
      where: {
        outletId,
        status: 'active',
        quantity: { gt: 0 },
        expiresAt: { not: null, lte: until },
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { expiresAt: 'asc' },
      take: MAX_BATCH_ROWS,
    });
  }

  /** Batches still marked active but already past expiry. */
  async getExpiredBatches(user: Caller, outletId: string) {
    await this.tenant.assertOutlet(user, outletId);
    return this.prisma.batchLot.findMany({
      where: {
        outletId,
        status: 'active',
        quantity: { gt: 0 },
        expiresAt: { not: null, lt: new Date() },
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { expiresAt: 'asc' },
      take: MAX_BATCH_ROWS,
    });
  }

  async getBatchSummary(user: Caller, productId: string, outletId: string) {
    const batches = await this.listByProduct(user, productId, outletId);

    const now = new Date();
    const sevenDaysLater = endOfBusinessDay(addBusinessDays(now, 7));
    let totalQuantity = new Prisma.Decimal(0);
    let activeBatches = 0;
    let expiredBatches = 0;
    let expiringWithin7Days = 0;

    for (const batch of batches) {
      const qty = new Prisma.Decimal(batch.quantity);
      if (batch.status !== 'active' || qty.lte(0)) continue;
      totalQuantity = totalQuantity.plus(qty);
      activeBatches++;
      if (batch.expiresAt) {
        if (batch.expiresAt < now) expiredBatches++;
        else if (batch.expiresAt <= sevenDaysLater) expiringWithin7Days++;
      }
    }

    return {
      totalQuantity: totalQuantity.toNumber(),
      activeBatches,
      expiredBatches,
      expiringWithin7Days,
      batches,
    };
  }

  /** Daily 01:00 WIB: mark batches whose expiry is before today (WIB) as expired. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: BUSINESS_TZ })
  async markExpiredBatches() {
    await this.locks.runExclusive('cron:batch-lots:mark-expired', 600, async () => {
      const result = await this.prisma.batchLot.updateMany({
        where: {
          status: 'active',
          expiresAt: { not: null, lt: startOfBusinessDay() },
        },
        data: { status: 'expired' },
      });
      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} batch lots as expired`);
      }
    });
  }
}
