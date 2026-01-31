import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService, ModifyItemsInput } from '../orders.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const makeOrder = (overrides: Record<string, unknown> = {}) => ({
    id: 'order-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    tableId: 'table-1',
    status: 'pending',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const makeOrderItem = (overrides: Record<string, unknown> = {}) => ({
    id: 'item-1',
    orderId: 'order-1',
    productId: 'prod-1',
    variantId: null,
    productName: 'Nasi Goreng',
    quantity: 2,
    station: null,
    notes: null,
    status: 'pending',
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      table: {
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new OrdersService(mockPrisma);
  });

  describe('modifyItems', () => {
    it('should add new items to an order', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Nasi Goreng', isActive: true },
      ]);
      (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue(makeOrderItem());

      const input: ModifyItemsInput = {
        addItems: [{ productId: 'prod-1', quantity: 2 }],
      };

      const result = await service.modifyItems('order-1', 'emp-1', input);

      expect(result.orderId).toBe('order-1');
      expect(result.itemsAdded).toBe(1);
      expect(result.itemsRemoved).toBe(0);
      expect(result.itemsUpdated).toBe(0);
      expect(mockPrisma.orderItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          productId: 'prod-1',
          quantity: 2,
          status: 'pending',
        }),
      });
    });

    it('should remove pending items from an order', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockPrisma.orderItem.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const input: ModifyItemsInput = {
        removeItemIds: ['item-1', 'item-2'],
      };

      const result = await service.modifyItems('order-1', 'emp-1', input);

      expect(result.itemsRemoved).toBe(2);
      expect(mockPrisma.orderItem.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['item-1', 'item-2'] },
          orderId: 'order-1',
          status: 'pending',
        },
      });
    });

    it('should update existing items on an order', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const input: ModifyItemsInput = {
        updateItems: [
          { itemId: 'item-1', quantity: 5, notes: 'No chili' },
        ],
      };

      const result = await service.modifyItems('order-1', 'emp-1', input);

      expect(result.itemsUpdated).toBe(1);
      expect(mockPrisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', orderId: 'order-1' },
        data: { quantity: 5, notes: 'No chili' },
      });
    });

    it('should throw NotFoundException when order is not found', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.modifyItems('nonexistent', 'emp-1', { addItems: [] }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.modifyItems('nonexistent', 'emp-1', { addItems: [] }),
      ).rejects.toThrow('Order nonexistent not found');
    });

    it('should throw BadRequestException when order is not in modifiable status', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(
        makeOrder({ status: 'preparing' }),
      );

      await expect(
        service.modifyItems('order-1', 'emp-1', { addItems: [] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.modifyItems('order-1', 'emp-1', { addItems: [] }),
      ).rejects.toThrow('Cannot modify order in status: preparing');
    });

    it('should throw NotFoundException when added product is not found', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const input: ModifyItemsInput = {
        addItems: [{ productId: 'prod-nonexistent', quantity: 1 }],
      };

      await expect(
        service.modifyItems('order-1', 'emp-1', input),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow modifications when order status is confirmed', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(
        makeOrder({ status: 'confirmed' }),
      );
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1', name: 'Nasi Goreng', isActive: true },
      ]);
      (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue(makeOrderItem());

      const result = await service.modifyItems('order-1', 'emp-1', {
        addItems: [{ productId: 'prod-1', quantity: 1 }],
      });

      expect(result.itemsAdded).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending order successfully', async () => {
      const order = makeOrder({
        items: [
          makeOrderItem({ status: 'pending' }),
        ],
      });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.cancel('order-1', 'emp-1', 'Customer left');

      expect(result.orderId).toBe('order-1');
      expect(result.previousStatus).toBe('pending');
      expect(result.reason).toBe('Customer left');
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(result.wastedItems).toEqual([]);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: 'cancelled',
          notes: '[CANCELLED] Customer left',
        },
      });
    });

    it('should identify wasted items that are preparing or ready', async () => {
      const order = makeOrder({
        items: [
          makeOrderItem({ id: 'item-1', productName: 'Nasi Goreng', quantity: 2, status: 'preparing' }),
          makeOrderItem({ id: 'item-2', productName: 'Mie Goreng', quantity: 1, status: 'ready' }),
          makeOrderItem({ id: 'item-3', productName: 'Es Teh', quantity: 1, status: 'pending' }),
        ],
      });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.cancel('order-1', 'emp-1', 'Kitchen error');

      expect(result.wastedItems).toHaveLength(2);
      expect(result.wastedItems[0]).toEqual({
        itemId: 'item-1',
        productName: 'Nasi Goreng',
        quantity: 2,
        status: 'preparing',
      });
      expect(result.wastedItems[1]).toEqual({
        itemId: 'item-2',
        productName: 'Mie Goreng',
        quantity: 1,
        status: 'ready',
      });
    });

    it('should throw NotFoundException when order is not found', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.cancel('nonexistent', 'emp-1', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order is not cancellable', async () => {
      const order = makeOrder({
        status: 'completed',
        items: [],
      });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);

      await expect(
        service.cancel('order-1', 'emp-1', 'Reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancel('order-1', 'emp-1', 'Reason'),
      ).rejects.toThrow('Cannot cancel order in status: completed');
    });

    it('should free up the table when order has a tableId', async () => {
      const order = makeOrder({
        tableId: 'table-5',
        items: [],
      });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.table.update as jest.Mock).mockResolvedValue({});

      await service.cancel('order-1', 'emp-1', 'Customer cancelled');

      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'table-5' },
        data: {
          status: 'available',
          currentOrderId: null,
          occupiedAt: null,
        },
      });
    });

    it('should not update table when order has no tableId', async () => {
      const order = makeOrder({
        tableId: null,
        items: [],
      });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.cancel('order-1', 'emp-1', 'Takeaway cancelled');

      expect(mockPrisma.table.update).not.toHaveBeenCalled();
    });

    it('should append cancellation reason to existing notes', async () => {
      const order = makeOrder({
        notes: 'Special request: no garlic',
        items: [],
      });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.cancel('order-1', 'emp-1', 'Changed mind');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: 'cancelled',
          notes: 'Special request: no garlic\n[CANCELLED] Changed mind',
        },
      });
    });

    it('should cancel all non-served and non-cancelled items', async () => {
      const order = makeOrder({ items: [] });
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(order);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.orderItem.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.cancel('order-1', 'emp-1', 'Reason');

      expect(mockPrisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: {
          orderId: 'order-1',
          status: { notIn: ['served', 'cancelled'] },
        },
        data: { status: 'cancelled' },
      });
    });
  });
});
