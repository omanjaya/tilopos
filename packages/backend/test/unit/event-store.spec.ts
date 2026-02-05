import {
  EventStore,
  EventEnvelope,
  EventReducer,
} from '../../src/infrastructure/events/event-store';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('EventStore', () => {
  let eventStore: EventStore;
  let mockPrisma: jest.Mocked<PrismaService>;

  const BUSINESS_ID = '00000000-0000-0000-0000-000000000000';

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    eventStore = new EventStore(mockPrisma);
  });

  // ==========================================================================
  // append
  // ==========================================================================

  describe('append', () => {
    it('should store a new event with version 1 when no prior events exist', async () => {
      // Arrange
      (mockPrisma.auditLog.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({
        id: 'event-1',
        entityId: 'order-123',
        entityType: 'Order',
        action: 'event:OrderCreated',
        oldValue: { version: 1 },
        newValue: { orderId: 'order-123', total: 50000 },
        metadata: {},
        createdAt: new Date('2026-01-15'),
      });

      const envelope: EventEnvelope = {
        aggregateId: 'order-123',
        aggregateType: 'Order',
        eventType: 'OrderCreated',
        eventData: { orderId: 'order-123', total: 50000 },
      };

      // Act
      const result = await eventStore.append(envelope);

      // Assert
      expect(result.version).toBe(1);
      expect(result.eventType).toBe('OrderCreated');
      expect(result.aggregateId).toBe('order-123');
      expect(result.eventData).toEqual({ orderId: 'order-123', total: 50000 });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: BUSINESS_ID,
          action: 'event:OrderCreated',
          entityType: 'Order',
          entityId: 'order-123',
          oldValue: { version: 1 },
          newValue: { orderId: 'order-123', total: 50000 },
        }),
      });
    });

    it('should increment version when prior events exist', async () => {
      // Arrange
      (mockPrisma.auditLog.findFirst as jest.Mock).mockResolvedValue({
        oldValue: { version: 3 },
      });
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({
        id: 'event-4',
        entityId: 'order-123',
        entityType: 'Order',
        action: 'event:ItemAdded',
        oldValue: { version: 4 },
        newValue: { itemId: 'item-1' },
        metadata: {},
        createdAt: new Date(),
      });

      const envelope: EventEnvelope = {
        aggregateId: 'order-123',
        aggregateType: 'Order',
        eventType: 'ItemAdded',
        eventData: { itemId: 'item-1' },
      };

      // Act
      const result = await eventStore.append(envelope);

      // Assert
      expect(result.version).toBe(4);
    });

    it('should pass metadata to the stored event', async () => {
      // Arrange
      (mockPrisma.auditLog.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({
        id: 'event-1',
        entityId: 'order-123',
        entityType: 'Order',
        action: 'event:OrderCreated',
        oldValue: { version: 1 },
        newValue: {},
        metadata: { userId: 'user-1', source: 'api' },
        createdAt: new Date(),
      });

      const envelope: EventEnvelope = {
        aggregateId: 'order-123',
        aggregateType: 'Order',
        eventType: 'OrderCreated',
        eventData: {},
        metadata: { userId: 'user-1', source: 'api' },
      };

      // Act
      await eventStore.append(envelope);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { userId: 'user-1', source: 'api' },
        }),
      });
    });
  });

  // ==========================================================================
  // getEvents
  // ==========================================================================

  describe('getEvents', () => {
    it('should return all events for an aggregate ordered by creation time', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          entityId: 'order-123',
          entityType: 'Order',
          action: 'event:OrderCreated',
          oldValue: { version: 1 },
          newValue: { total: 50000 },
          metadata: {},
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'e2',
          entityId: 'order-123',
          entityType: 'Order',
          action: 'event:ItemAdded',
          oldValue: { version: 2 },
          newValue: { itemId: 'item-1' },
          metadata: {},
          createdAt: new Date('2026-01-02'),
        },
      ]);

      // Act
      const events = await eventStore.getEvents('order-123');

      // Assert
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('OrderCreated');
      expect(events[0].version).toBe(1);
      expect(events[1].eventType).toBe('ItemAdded');
      expect(events[1].version).toBe(2);
    });

    it('should filter by aggregate type when provided', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await eventStore.getEvents('order-123', 'Order');

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityId: 'order-123',
          entityType: 'Order',
          action: { startsWith: 'event:' },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no events exist', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const events = await eventStore.getEvents('nonexistent');

      // Assert
      expect(events).toEqual([]);
    });
  });

  // ==========================================================================
  // getEventsByType
  // ==========================================================================

  describe('getEventsByType', () => {
    it('should return events filtered by event type', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          entityId: 'order-1',
          entityType: 'Order',
          action: 'event:OrderCreated',
          oldValue: { version: 1 },
          newValue: {},
          metadata: {},
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'e2',
          entityId: 'order-2',
          entityType: 'Order',
          action: 'event:OrderCreated',
          oldValue: { version: 1 },
          newValue: {},
          metadata: {},
          createdAt: new Date('2026-01-02'),
        },
      ]);

      // Act
      const events = await eventStore.getEventsByType('OrderCreated');

      // Assert
      expect(events).toHaveLength(2);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'event:OrderCreated' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should filter events by since date when provided', async () => {
      // Arrange
      const since = new Date('2026-01-15');
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await eventStore.getEventsByType('OrderCreated', since);

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'event:OrderCreated',
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  // ==========================================================================
  // replay
  // ==========================================================================

  describe('replay', () => {
    it('should replay events through a reducer to rebuild state', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          entityId: 'order-123',
          entityType: 'Order',
          action: 'event:OrderCreated',
          oldValue: { version: 1 },
          newValue: { total: 0 },
          metadata: {},
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'e2',
          entityId: 'order-123',
          entityType: 'Order',
          action: 'event:ItemAdded',
          oldValue: { version: 2 },
          newValue: { itemId: 'item-1', price: 25000 },
          metadata: {},
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 'e3',
          entityId: 'order-123',
          entityType: 'Order',
          action: 'event:ItemAdded',
          oldValue: { version: 3 },
          newValue: { itemId: 'item-2', price: 15000 },
          metadata: {},
          createdAt: new Date('2026-01-03'),
        },
      ]);

      const reducer: EventReducer = (state, event) => {
        if (event.eventType === 'OrderCreated') {
          return { ...state, total: 0, items: [] };
        }
        if (event.eventType === 'ItemAdded') {
          const items = (state.items as unknown[]) || [];
          const price = (event.eventData.price as number) || 0;
          return {
            ...state,
            total: (state.total as number) + price,
            items: [...items, event.eventData.itemId],
          };
        }
        return state;
      };

      // Act
      const result = await eventStore.replay('order-123', reducer);

      // Assert
      expect(result.id).toBe('order-123');
      expect(result.version).toBe(3);
      expect(result.state.total).toBe(40000);
      expect(result.state.items).toEqual(['item-1', 'item-2']);
    });

    it('should return initial state when no events exist', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const reducer: EventReducer = (state) => state;

      // Act
      const result = await eventStore.replay('empty-123', reducer, { total: 0 });

      // Assert
      expect(result.id).toBe('empty-123');
      expect(result.version).toBe(0);
      expect(result.state).toEqual({ total: 0 });
    });

    it('should pass aggregate type filter when provided', async () => {
      // Arrange
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const reducer: EventReducer = (state) => state;

      // Act
      await eventStore.replay('order-123', reducer, {}, 'Order');

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityId: 'order-123',
          entityType: 'Order',
          action: { startsWith: 'event:' },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
