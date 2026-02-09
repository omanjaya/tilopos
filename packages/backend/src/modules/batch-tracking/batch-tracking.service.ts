import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CreateBatchLotDto {
  productId: string;
  outletId: string;
  batchNumber: string;
  quantity: number;
  costPrice?: number;
  manufacturedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface UpdateBatchLotDto {
  quantity?: number;
  costPrice?: number;
  expiresAt?: string | null;
  notes?: string;
  status?: 'active' | 'depleted' | 'expired' | 'recalled';
}

export interface BatchDeductionResult {
  deducted: number;
  batches: { batchId: string; batchNumber: string; deducted: number; remaining: number }[];
}

@Injectable()
export class BatchTrackingService {
  private readonly logger = new Logger(BatchTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByProduct(productId: string, outletId: string) {
    return this.prisma.batchLot.findMany({
      where: { productId, outletId },
      orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }],
    });
  }

  async listActive(productId: string, outletId: string) {
    return this.prisma.batchLot.findMany({
      where: { productId, outletId, status: 'active', quantity: { gt: 0 } },
      orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }],
    });
  }

  async create(dto: CreateBatchLotDto) {
    if (dto.quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    return this.prisma.batchLot.create({
      data: {
        productId: dto.productId,
        outletId: dto.outletId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        costPrice: dto.costPrice ?? null,
        manufacturedAt: dto.manufacturedAt ? new Date(dto.manufacturedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateBatchLotDto) {
    const batch = await this.prisma.batchLot.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch lot not found');

    return this.prisma.batchLot.update({
      where: { id },
      data: {
        quantity: dto.quantity,
        costPrice: dto.costPrice,
        expiresAt:
          dto.expiresAt !== undefined
            ? dto.expiresAt
              ? new Date(dto.expiresAt)
              : null
            : undefined,
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.batchLot.delete({ where: { id } });
  }

  /**
   * FIFO deduction: deduct quantity from oldest/soonest-to-expire batches first.
   * Used when a sale happens.
   */
  async deductFIFO(
    productId: string,
    outletId: string,
    quantityToDeduct: number,
  ): Promise<BatchDeductionResult> {
    const batches = await this.prisma.batchLot.findMany({
      where: { productId, outletId, status: 'active', quantity: { gt: 0 } },
      orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }],
    });

    let remaining = quantityToDeduct;
    const deductions: BatchDeductionResult['batches'] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available = Number(batch.quantity);
      const toDeduct = Math.min(available, remaining);
      const newQty = available - toDeduct;

      await this.prisma.batchLot.update({
        where: { id: batch.id },
        data: {
          quantity: newQty,
          status: newQty <= 0 ? 'depleted' : 'active',
        },
      });

      deductions.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        deducted: toDeduct,
        remaining: newQty,
      });

      remaining -= toDeduct;
    }

    if (remaining > 0) {
      this.logger.warn(
        `Insufficient batch stock for product ${productId}: needed ${quantityToDeduct}, short by ${remaining}`,
      );
    }

    return {
      deducted: quantityToDeduct - remaining,
      batches: deductions,
    };
  }

  /**
   * Get batches expiring within N days for an outlet.
   */
  async getExpiringBatches(outletId: string, daysAhead: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.batchLot.findMany({
      where: {
        outletId,
        status: 'active',
        quantity: { gt: 0 },
        expiresAt: { not: null, lte: futureDate },
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { expiresAt: 'asc' },
    });
  }

  /**
   * Get already expired batches (still active status but past expiry).
   */
  async getExpiredBatches(outletId: string) {
    return this.prisma.batchLot.findMany({
      where: {
        outletId,
        status: 'active',
        quantity: { gt: 0 },
        expiresAt: { not: null, lt: new Date() },
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { expiresAt: 'asc' },
    });
  }

  /**
   * Get batch summary for a product at an outlet.
   */
  async getBatchSummary(productId: string, outletId: string) {
    const batches = await this.listByProduct(productId, outletId);

    const now = new Date();
    let totalQuantity = 0;
    let activeBatches = 0;
    let expiredBatches = 0;
    let expiringWithin7Days = 0;
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    for (const batch of batches) {
      const qty = Number(batch.quantity);
      if (batch.status === 'active' && qty > 0) {
        totalQuantity += qty;
        activeBatches++;

        if (batch.expiresAt) {
          if (batch.expiresAt < now) {
            expiredBatches++;
          } else if (batch.expiresAt <= sevenDaysLater) {
            expiringWithin7Days++;
          }
        }
      }
    }

    return {
      totalQuantity,
      activeBatches,
      expiredBatches,
      expiringWithin7Days,
      batches,
    };
  }

  /**
   * Cron job: auto-mark expired batches every day at 1am.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markExpiredBatches() {
    const result = await this.prisma.batchLot.updateMany({
      where: {
        status: 'active',
        expiresAt: { not: null, lt: new Date() },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} batch lots as expired`);
    }
  }
}
