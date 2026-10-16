import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import { OrdersService } from '../orders.service';

describe('OrdersService', () => {
  let prisma: {
    order: { findMany: jest.Mock; updateMany: jest.Mock; findFirst: jest.Mock };
  };
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn(),
      },
    };
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  describe('getOrder', () => {
    it('reads the order only within the caller business and maps table/customer names', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'ord-1',
        outletId: 'o-1',
        orderNumber: 'ORD-1',
        orderType: 'dine_in',
        tableId: 't-1',
        customerId: null,
        status: 'pending',
        priority: 0,
        notes: null,
        estimatedTime: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        table: { name: 'Meja 7' },
        customer: null,
      });
      const order = await service.getOrder('ord-1', 'biz-1');
      expect(prisma.order.findFirst.mock.calls[0][0].where).toEqual({
        id: 'ord-1',
        outlet: { businessId: 'biz-1' },
      });
      expect(order.tableName).toBe('Meja 7');
      expect(order.customerName).toBeNull();
    });

    it('404s for an unknown or foreign order', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.getOrder('ord-x', 'biz-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listOrders', () => {
    it('filters with outletId IN the resolved outlets and caps the result', async () => {
      await service.listOrders(['o-1', 'o-2']);
      const args = prisma.order.findMany.mock.calls[0][0];
      expect(args.where.outletId).toEqual({ in: ['o-1', 'o-2'] });
      expect(args.where.status).toEqual({ in: expect.arrayContaining(['pending', 'ready']) });
      expect(args.take).toBeLessThanOrEqual(200);
    });

    it('never queries without an outlet scope', async () => {
      await expect(service.listOrders([])).resolves.toEqual([]);
      expect(prisma.order.findMany).not.toHaveBeenCalled();
    });

    it('maps table and customer names', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          outletId: 'o-1',
          orderNumber: 'ORD-1',
          orderType: 'dine_in',
          tableId: 't-1',
          customerId: 'c-1',
          status: 'pending',
          priority: 0,
          notes: null,
          estimatedTime: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          table: { name: 'Meja 1' },
          customer: { name: 'Budi' },
        },
      ]);
      const [order] = await service.listOrders(['o-1']);
      expect(order.tableName).toBe('Meja 1');
      expect(order.customerName).toBe('Budi');
    });
  });

  describe('setPriority', () => {
    it('updates conditionally, scoped by business and editable status', async () => {
      const result = await service.setPriority('ord-1', 'biz-1', 'vip');
      expect(result.numericPriority).toBe(10);
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'ord-1',
          outlet: { businessId: 'biz-1' },
          status: { in: ['pending', 'confirmed', 'preparing'] },
        },
        data: { priority: 10 },
      });
    });

    it('404s for an order of another business', async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 0 });
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.setPriority('ord-x', 'biz-1', 'urgent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('409s when the order is no longer editable', async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 0 });
      prisma.order.findFirst.mockResolvedValue({ status: 'completed' });
      await expect(service.setPriority('ord-1', 'biz-1', 'urgent')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
