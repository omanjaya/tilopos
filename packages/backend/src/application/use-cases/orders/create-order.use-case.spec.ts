import { CreateOrderUseCase, CreateOrderInput } from './create-order.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import type {
  IOrderRepository,
  OrderRecord,
} from '@domain/interfaces/repositories/order.repository';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBusService>;

  const savedOrder: OrderRecord = {
    id: 'order-1',
    outletId: 'outlet-1',
    orderNumber: 'ORD-TEST123',
    orderType: 'dine_in',
    tableId: null,
    customerId: null,
    status: 'pending',
    priority: 0,
    notes: null,
    estimatedTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseProduct = {
    id: 'prod-1',
    name: 'Nasi Goreng',
    isActive: true,
  };

  const baseDineInInput: CreateOrderInput = {
    outletId: 'outlet-1',
    orderType: 'dine_in',
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  const baseTakeawayInput: CreateOrderInput = {
    outletId: 'outlet-1',
    orderType: 'takeaway',
    items: [{ productId: 'prod-1', quantity: 1 }],
  };

  beforeEach(() => {
    mockOrderRepo = {
      findById: jest.fn(),
      findByOutletId: jest.fn(),
      findActiveByOutletId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      product: {
        findMany: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
      },
      table: {
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    useCase = new CreateOrderUseCase(mockOrderRepo, mockPrisma, mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a dine-in order successfully', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue(savedOrder);
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(baseDineInInput);

    expect(result.orderId).toBe('order-1');
    expect(result.orderNumber).toBeDefined();
    expect(result.orderNumber).toMatch(/^ORD-/);
    expect(result.estimatedTime).toBeNull();
    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        orderType: 'dine_in',
        status: 'pending',
      }),
    );
  });

  it('should create a takeaway order successfully', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue({ ...savedOrder, orderType: 'takeaway' });
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(baseTakeawayInput);

    expect(result.orderId).toBe('order-1');
    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'takeaway',
      }),
    );
  });

  it('should create a delivery order successfully', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue({ ...savedOrder, orderType: 'delivery' });
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    const deliveryInput: CreateOrderInput = {
      outletId: 'outlet-1',
      orderType: 'delivery',
      items: [{ productId: 'prod-1', quantity: 1 }],
    };

    const result = await useCase.execute(deliveryInput);

    expect(result.orderId).toBe('order-1');
    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'delivery',
      }),
    );
  });

  it('should link order to table and update table status for dine-in', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue({
      ...savedOrder,
      tableId: 'table-5',
    });
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.table.update as jest.Mock).mockResolvedValue({});

    const inputWithTable: CreateOrderInput = {
      ...baseDineInInput,
      tableId: 'table-5',
    };

    await useCase.execute(inputWithTable);

    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'table-5',
      }),
    );
    expect(mockPrisma.table.update).toHaveBeenCalledWith({
      where: { id: 'table-5' },
      data: expect.objectContaining({
        status: 'occupied',
        currentOrderId: 'order-1',
      }),
    });
  });

  it('should NOT update table when no tableId is provided', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue(savedOrder);
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    await useCase.execute(baseDineInInput);

    expect(mockPrisma.table.update).not.toHaveBeenCalled();
  });

  it('should create order items with correct product names', async () => {
    const products = [
      { id: 'prod-1', name: 'Nasi Goreng', isActive: true },
      { id: 'prod-2', name: 'Mie Goreng', isActive: true },
    ];
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(products);
    mockOrderRepo.save.mockResolvedValue(savedOrder);
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    const multiItemInput: CreateOrderInput = {
      outletId: 'outlet-1',
      orderType: 'dine_in',
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1, notes: 'No chili' },
      ],
    };

    await useCase.execute(multiItemInput);

    expect(mockPrisma.orderItem.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.orderItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        productId: 'prod-1',
        productName: 'Nasi Goreng',
        quantity: 2,
        status: 'pending',
      }),
    });
    expect(mockPrisma.orderItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        productId: 'prod-2',
        productName: 'Mie Goreng',
        quantity: 1,
        notes: 'No chili',
        status: 'pending',
      }),
    });
  });

  it('should use "Unknown" when product is not found in database', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]); // empty - no products found
    mockOrderRepo.save.mockResolvedValue(savedOrder);
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    await useCase.execute(baseDineInInput);

    expect(mockPrisma.orderItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productName: 'Unknown',
      }),
    });
  });

  it('should publish OrderStatusChangedEvent after creation', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue(savedOrder);
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    await useCase.execute(baseDineInInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(OrderStatusChangedEvent));
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        outletId: 'outlet-1',
        newStatus: 'pending',
      }),
    );
  });

  it('should set default priority to 0 when not provided', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue(savedOrder);
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    await useCase.execute(baseDineInInput);

    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 0,
      }),
    );
  });

  it('should use provided priority value', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue({ ...savedOrder, priority: 5 });
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    const priorityInput: CreateOrderInput = {
      ...baseDineInInput,
      priority: 5,
    };

    await useCase.execute(priorityInput);

    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 5,
      }),
    );
  });

  it('should set customerId when provided', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([baseProduct]);
    mockOrderRepo.save.mockResolvedValue({ ...savedOrder, customerId: 'cust-1' });
    (mockPrisma.orderItem.create as jest.Mock).mockResolvedValue({});

    const inputWithCustomer: CreateOrderInput = {
      ...baseDineInInput,
      customerId: 'cust-1',
    };

    await useCase.execute(inputWithCustomer);

    expect(mockOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
      }),
    );
  });
});
