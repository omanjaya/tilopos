import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventBusService } from '../../infrastructure/events/event-bus.service';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '../../shared/tenant/tenant-access.service';
import { BumpOrderUseCase } from '../../application/use-cases/kds/bump-order.use-case';
import { GetStationOrdersUseCase } from '../../application/use-cases/kds/get-station-orders.use-case';
import { KdsController } from './kds.controller';
import type { KdsService } from './kds.service';
import type { KdsAnalyticsService } from './kds-analytics.service';

const user: AuthUser = { employeeId: 'e-1', businessId: 'biz-a', outletId: null, role: 'kitchen' };

describe('BumpOrderUseCase', () => {
  let tx: {
    orderItem: { findFirst: jest.Mock; updateMany: jest.Mock; count: jest.Mock };
    order: { findFirst: jest.Mock; updateMany: jest.Mock };
  };
  let eventBus: { publish: jest.Mock };
  let useCase: BumpOrderUseCase;

  beforeEach(() => {
    tx = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'i-1', status: 'preparing', orderId: 'o-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'o-1', status: 'preparing', outletId: 'outlet-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
    eventBus = { publish: jest.fn() };
    useCase = new BumpOrderUseCase(
      prisma as unknown as PrismaService,
      eventBus as unknown as EventBusService,
    );
  });

  it('looks the item up within the caller business', async () => {
    tx.orderItem.findFirst.mockResolvedValue(null);
    await expect(
      useCase.execute({ orderItemId: 'i-x', businessId: 'biz-a', employeeId: 'e' }),
    ).rejects.toThrow(NotFoundException);
    expect(tx.orderItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'i-x', order: { outlet: { businessId: 'biz-a' } } },
      }),
    );
  });

  it('locks the order row before counting, and marks the order ready when all items are done', async () => {
    tx.orderItem.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    const result = await useCase.execute({
      orderItemId: 'i-1',
      businessId: 'biz-a',
      employeeId: 'e',
    });

    expect(result.allItemsCompleted).toBe(true);
    // first updateMany = row lock, then item bump, then order → ready
    expect(tx.order.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.orderItem.updateMany.mock.invocationCallOrder[0],
    );
    expect(tx.order.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { status: 'ready' } }),
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('treats cancelled items as done', async () => {
    // remaining (not ready/served/cancelled) = 0, non-cancelled = 1
    tx.orderItem.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const result = await useCase.execute({
      orderItemId: 'i-1',
      businessId: 'biz-a',
      employeeId: 'e',
    });
    expect(result.allItemsCompleted).toBe(true);
    expect(tx.orderItem.count.mock.calls[0][0].where.status.notIn).toContain('cancelled');
  });

  it('refuses to bump items of a cancelled order (no revival)', async () => {
    tx.order.findFirst.mockResolvedValue({ id: 'o-1', status: 'cancelled', outletId: 'outlet-1' });
    await expect(
      useCase.execute({ orderItemId: 'i-1', businessId: 'biz-a', employeeId: 'e' }),
    ).rejects.toThrow(ConflictException);
    expect(tx.orderItem.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to bump a cancelled item', async () => {
    tx.orderItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      useCase.execute({ orderItemId: 'i-1', businessId: 'biz-a', employeeId: 'e' }),
    ).rejects.toThrow(ConflictException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

describe('GetStationOrdersUseCase', () => {
  it('keeps the active-status filter when ?status= is given and bounds the result', async () => {
    const prisma = { orderItem: { findMany: jest.fn().mockResolvedValue([]) } };
    const useCase = new GetStationOrdersUseCase(prisma as unknown as PrismaService);

    await useCase.execute({ outletId: 'outlet-1', status: 'preparing' });
    const args = prisma.orderItem.findMany.mock.calls[0][0];
    expect(args.where).toEqual(
      expect.objectContaining({ order: { outletId: 'outlet-1' }, status: 'preparing' }),
    );
    expect(args.take).toBeGreaterThan(0);
  });

  it('refuses to run without an outlet', async () => {
    const prisma = { orderItem: { findMany: jest.fn() } };
    const useCase = new GetStationOrdersUseCase(prisma as unknown as PrismaService);
    await expect(useCase.execute({ outletId: '' })).rejects.toThrow();
    expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
  });
});

describe('KdsController tenant checks', () => {
  let prisma: { outlet: { count: jest.Mock; findMany: jest.Mock } };
  let kdsService: { getOverdueOrders: jest.Mock };
  let stationOrders: { execute: jest.Mock };
  let controller: KdsController;

  beforeEach(() => {
    prisma = { outlet: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() } };
    kdsService = { getOverdueOrders: jest.fn().mockResolvedValue({ overdue: [], total: 0 }) };
    stationOrders = { execute: jest.fn() };
    controller = new KdsController(
      {} as BumpOrderUseCase,
      stationOrders as unknown as GetStationOrdersUseCase,
      {} as KdsAnalyticsService,
      kdsService as unknown as KdsService,
      new TenantAccessService(prisma as unknown as PrismaService),
    );
  });

  it('GET /kds/overdue checks outlet access before reading orders', async () => {
    await expect(
      controller.getOverdueOrders(user, { outletId: 'outlet-of-other-tenant' }),
    ).rejects.toThrow(ForbiddenException);
    expect(kdsService.getOverdueOrders).not.toHaveBeenCalled();
  });

  it('GET /kds/orders rejects a foreign outlet', async () => {
    await expect(
      controller.getStationOrders({ outletId: 'outlet-of-other-tenant' }, user),
    ).rejects.toThrow(ForbiddenException);
    expect(stationOrders.execute).not.toHaveBeenCalled();
  });

  it('GET /kds/overdue works for an own outlet', async () => {
    prisma.outlet.count.mockResolvedValue(1);
    await controller.getOverdueOrders(user, { outletId: 'outlet-a' });
    expect(kdsService.getOverdueOrders).toHaveBeenCalledWith('biz-a', 'outlet-a');
  });
});
