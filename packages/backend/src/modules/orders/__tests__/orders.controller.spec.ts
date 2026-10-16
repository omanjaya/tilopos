import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantAccessService } from '../../../shared/tenant/tenant-access.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';
import type { CreateOrderUseCase } from '../../../application/use-cases/orders/create-order.use-case';

/**
 * GET /orders without outletId used to drop the outlet filter and return every
 * tenant's orders. It must now only ever query the caller's own outlets.
 */
describe('OrdersController tenant scoping', () => {
  const user: AuthUser = {
    employeeId: 'emp-a',
    businessId: 'biz-a',
    outletId: null,
    role: 'owner',
  };

  let prisma: {
    outlet: { findMany: jest.Mock; count: jest.Mock };
    order: { findMany: jest.Mock };
  };
  let createOrder: { execute: jest.Mock };
  let controller: OrdersController;

  beforeEach(() => {
    prisma = {
      outlet: {
        findMany: jest.fn().mockResolvedValue([{ id: 'outlet-a1' }, { id: 'outlet-a2' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      order: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const tenant = new TenantAccessService(prisma as unknown as PrismaService);
    const ordersService = new OrdersService(prisma as unknown as PrismaService);
    createOrder = { execute: jest.fn().mockResolvedValue({ orderId: 'x' }) };
    controller = new OrdersController(
      createOrder as unknown as CreateOrderUseCase,
      {} as never,
      {} as never,
      {} as never,
      ordersService,
      tenant,
    );
  });

  it('GET /orders without outletId lists only outlets of the caller business', async () => {
    await controller.listOrders({}, user);

    expect(prisma.outlet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 'biz-a' } }),
    );
    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.outletId).toEqual({ in: ['outlet-a1', 'outlet-a2'] });
  });

  it('GET /orders with a foreign outletId is rejected', async () => {
    prisma.outlet.count.mockResolvedValue(0);
    await expect(controller.listOrders({ outletId: 'outlet-b' }, user)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('POST /orders with a foreign outletId is rejected before the use case runs', async () => {
    prisma.outlet.count.mockResolvedValue(0);
    await expect(
      controller.createOrder(
        { outletId: 'outlet-b', orderType: 'takeaway', items: [{ productId: 'p', quantity: 1 }] },
        user,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(createOrder.execute).not.toHaveBeenCalled();
  });

  it('POST /orders without any outlet is a 400, never an unscoped order', async () => {
    await expect(
      controller.createOrder(
        { orderType: 'takeaway', items: [{ productId: 'p', quantity: 1 }] },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
