import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { EventBusService } from '@infrastructure/events/event-bus.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import { CancelOrderUseCase } from './cancel-order.use-case';
import { UpdateOrderStatusUseCase } from './update-order-status.use-case';
import { ModifyOrderUseCase } from './modify-order.use-case';

function makeTx() {
  return {
    order: { findFirst: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    orderItem: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    table: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    product: { findMany: jest.fn().mockResolvedValue([{ id: 'p-1', name: 'Es Teh' }]) },
    productVariant: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('order state use cases', () => {
  let tx: ReturnType<typeof makeTx>;
  let prisma: PrismaService;
  let eventBus: { publish: jest.Mock };

  beforeEach(() => {
    tx = makeTx();
    prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
    eventBus = { publish: jest.fn() };
  });

  describe('CancelOrderUseCase', () => {
    const useCase = () => new CancelOrderUseCase(prisma, eventBus as unknown as EventBusService);
    const order = {
      id: 'ord-1',
      outletId: 'o-1',
      status: 'preparing',
      tableId: 't-1',
      notes: null,
      items: [{ id: 'i-1', productName: 'Sate', quantity: 1, status: 'preparing' }],
    };

    it('cancels conditionally and only frees the table this order holds', async () => {
      tx.order.findFirst.mockResolvedValue(order);
      const result = await useCase().execute({
        orderId: 'ord-1',
        businessId: 'biz-1',
        employeeId: 'e-1',
        reason: 'Customer left',
      });

      expect(tx.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ord-1', outlet: { businessId: 'biz-1' } } }),
      );
      expect(tx.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ord-1', status: 'preparing' } }),
      );
      expect(tx.table.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't-1', currentOrderId: 'ord-1' } }),
      );
      expect(result.wastedItems).toHaveLength(1);
    });

    it('409s on a concurrent status change (double cancel)', async () => {
      tx.order.findFirst.mockResolvedValue(order);
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        useCase().execute({ orderId: 'ord-1', businessId: 'biz-1', employeeId: 'e', reason: 'x' }),
      ).rejects.toThrow(ConflictException);
      expect(tx.orderItem.updateMany).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('409s (not 404) for a non-cancellable status', async () => {
      tx.order.findFirst.mockResolvedValue({ ...order, status: 'completed' });
      await expect(
        useCase().execute({ orderId: 'ord-1', businessId: 'biz-1', employeeId: 'e', reason: 'x' }),
      ).rejects.toThrow(ConflictException);
    });

    it('404s for an order of another business', async () => {
      tx.order.findFirst.mockResolvedValue(null);
      await expect(
        useCase().execute({ orderId: 'ord-1', businessId: 'biz-2', employeeId: 'e', reason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('requires a reason', async () => {
      await expect(
        useCase().execute({ orderId: 'ord-1', businessId: 'biz-1', employeeId: 'e', reason: ' ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UpdateOrderStatusUseCase', () => {
    const useCase = () =>
      new UpdateOrderStatusUseCase(prisma, eventBus as unknown as EventBusService);

    it('applies a valid transition with a conditional update', async () => {
      tx.order.findFirst.mockResolvedValue({
        id: 'ord-1',
        status: 'ready',
        outletId: 'o-1',
        tableId: 't-1',
      });
      await useCase().execute({
        orderId: 'ord-1',
        businessId: 'biz-1',
        status: 'completed',
        employeeId: 'e',
      });
      expect(tx.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ord-1', status: 'ready' } }),
      );
      expect(tx.table.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't-1', currentOrderId: 'ord-1' } }),
      );
    });

    it('rejects an invalid transition (e.g. completed → preparing)', async () => {
      tx.order.findFirst.mockResolvedValue({ id: 'ord-1', status: 'completed', outletId: 'o-1' });
      await expect(
        useCase().execute({
          orderId: 'ord-1',
          businessId: 'biz-1',
          status: 'preparing',
          employeeId: 'e',
        }),
      ).rejects.toThrow(ConflictException);
      expect(tx.order.updateMany).not.toHaveBeenCalled();
    });

    it('rejects when a concurrent update won the race', async () => {
      tx.order.findFirst.mockResolvedValue({ id: 'ord-1', status: 'pending', outletId: 'o-1' });
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        useCase().execute({
          orderId: 'ord-1',
          businessId: 'biz-1',
          status: 'preparing',
          employeeId: 'e',
        }),
      ).rejects.toThrow(ConflictException);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('ModifyOrderUseCase', () => {
    const useCase = () => new ModifyOrderUseCase(prisma);

    it('rejects quantity 0 before touching the database', async () => {
      await expect(
        useCase().execute({
          orderId: 'ord-1',
          businessId: 'biz-1',
          employeeId: 'e',
          updateItems: [{ itemId: 'i-1', quantity: 0 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(tx.order.findFirst).not.toHaveBeenCalled();
    });

    it('adds items from the caller business only, inside one transaction', async () => {
      tx.order.findFirst.mockResolvedValue({ id: 'ord-1', status: 'pending' });
      const result = await useCase().execute({
        orderId: 'ord-1',
        businessId: 'biz-1',
        employeeId: 'e',
        addItems: [{ productId: 'p-1', quantity: 2 }],
      });
      expect(tx.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ businessId: 'biz-1' }) }),
      );
      expect(result.itemsAdded).toBe(1);
    });

    it('409s when the order started preparing concurrently', async () => {
      tx.order.findFirst.mockResolvedValue({ id: 'ord-1', status: 'pending' });
      tx.order.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        useCase().execute({
          orderId: 'ord-1',
          businessId: 'biz-1',
          employeeId: 'e',
          addItems: [{ productId: 'p-1', quantity: 1 }],
        }),
      ).rejects.toThrow(ConflictException);
      expect(tx.orderItem.createMany).not.toHaveBeenCalled();
    });

    it('counts only rows actually updated', async () => {
      tx.order.findFirst.mockResolvedValue({ id: 'ord-1', status: 'pending' });
      tx.orderItem.updateMany.mockResolvedValue({ count: 0 });
      const result = await useCase().execute({
        orderId: 'ord-1',
        businessId: 'biz-1',
        employeeId: 'e',
        updateItems: [{ itemId: 'i-x', quantity: 2 }],
      });
      expect(result.itemsUpdated).toBe(0);
    });
  });
});
