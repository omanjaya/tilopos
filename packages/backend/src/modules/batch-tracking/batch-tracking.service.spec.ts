import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BatchTrackingService } from './batch-tracking.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TenantAccessService } from '@shared/tenant';
import type { DistributedLockService } from '@shared/locks/distributed-lock.service';

describe('BatchTrackingService (tenant scoping + FIFO atomicity)', () => {
  const user = { businessId: 'biz-a' };
  let prisma: {
    batchLot: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let tenant: { assertOutlet: jest.Mock; assertOwned: jest.Mock };
  let service: BatchTrackingService;

  beforeEach(() => {
    prisma = {
      batchLot: {
        create: jest.fn().mockResolvedValue({ id: 'b1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'b1' }),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    tenant = {
      assertOutlet: jest.fn().mockResolvedValue('outlet-a'),
      assertOwned: jest.fn().mockResolvedValue(undefined),
    };
    const locks = { runExclusive: jest.fn(async (_k, _t, fn: () => unknown) => fn()) };
    service = new BatchTrackingService(
      prisma as unknown as PrismaService,
      tenant as unknown as TenantAccessService,
      locks as unknown as DistributedLockService,
    );
  });

  const dto = {
    productId: 'prod-b',
    outletId: 'outlet-b',
    batchNumber: 'LOT-1',
    quantity: 5,
  };

  it('rejects creating a batch for another tenant outlet', async () => {
    tenant.assertOutlet.mockRejectedValue(new ForbiddenException());
    await expect(service.create(user, dto)).rejects.toThrow(ForbiddenException);
    expect(prisma.batchLot.create).not.toHaveBeenCalled();
  });

  it('rejects creating a batch for another tenant product', async () => {
    tenant.assertOwned.mockRejectedValue(new ForbiddenException());
    await expect(service.create(user, dto)).rejects.toThrow(ForbiddenException);
    expect(tenant.assertOwned).toHaveBeenCalledWith('product', 'prod-b', 'biz-a');
    expect(prisma.batchLot.create).not.toHaveBeenCalled();
  });

  it('scopes update by business and 404s a foreign batch', async () => {
    prisma.batchLot.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update(user, 'b-foreign', { quantity: 1 })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.batchLot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b-foreign', outlet: { businessId: 'biz-a' } } }),
    );
  });

  it('scopes delete by business and 404s a foreign batch', async () => {
    prisma.batchLot.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.delete(user, 'b-foreign')).rejects.toThrow(NotFoundException);
    expect(prisma.batchLot.deleteMany).toHaveBeenCalledWith({
      where: { id: 'b-foreign', outlet: { businessId: 'biz-a' } },
    });
  });

  it('deducts FIFO with conditional decrements', async () => {
    prisma.batchLot.findMany.mockResolvedValue([
      { id: 'b1', batchNumber: 'L1', quantity: new Prisma.Decimal(3) },
      { id: 'b2', batchNumber: 'L2', quantity: new Prisma.Decimal(10) },
    ]);
    const result = await service.deductFIFO(user, 'prod-a', 'outlet-a', 5);
    expect(result.deducted).toBe(5);
    expect(result.batches).toEqual([
      { batchId: 'b1', batchNumber: 'L1', deducted: 3, remaining: 0 },
      { batchId: 'b2', batchNumber: 'L2', deducted: 2, remaining: 8 },
    ]);
    expect(prisma.batchLot.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', status: 'active', quantity: { gte: new Prisma.Decimal(3) } },
      data: { quantity: { decrement: new Prisma.Decimal(3) } },
    });
  });

  it('rejects FIFO deduction when a batch changed concurrently', async () => {
    prisma.batchLot.findMany.mockResolvedValue([
      { id: 'b1', batchNumber: 'L1', quantity: new Prisma.Decimal(3) },
    ]);
    prisma.batchLot.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.deductFIFO(user, 'prod-a', 'outlet-a', 2)).rejects.toThrow(
      ConflictException,
    );
  });
});
