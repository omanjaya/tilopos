import { describe, it, expect, beforeEach } from 'vitest';
import { useOrderStore } from '../order.store';
import type { Order } from '@/types/order.types';

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    outletId: 'outlet-1',
    tableId: 'table-1',
    tableName: 'Table 1',
    status: 'pending',
    orderType: 'dine_in',
    items: [],
    employeeName: 'Cashier A',
    customerName: null,
    notes: null,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('order.store', () => {
  beforeEach(() => {
    useOrderStore.setState({
      activeOrders: [],
      isLoading: false,
      error: null,
    });
  });

  describe('setOrders', () => {
    it('sets the list of active orders', () => {
      const orders = [
        createMockOrder({ id: 'order-1' }),
        createMockOrder({ id: 'order-2' }),
      ];

      useOrderStore.getState().setOrders(orders);

      expect(useOrderStore.getState().activeOrders).toHaveLength(2);
    });

    it('replaces existing orders', () => {
      useOrderStore.getState().setOrders([createMockOrder({ id: 'old' })]);
      useOrderStore.getState().setOrders([createMockOrder({ id: 'new' })]);

      const state = useOrderStore.getState();
      expect(state.activeOrders).toHaveLength(1);
      expect(state.activeOrders[0]?.id).toBe('new');
    });

    it('clears error when setting orders', () => {
      useOrderStore.setState({ error: 'Network error' });
      useOrderStore.getState().setOrders([]);

      expect(useOrderStore.getState().error).toBeNull();
    });
  });

  describe('addOrder', () => {
    it('appends an order to the list', () => {
      useOrderStore.getState().setOrders([createMockOrder({ id: 'order-1' })]);
      useOrderStore.getState().addOrder(createMockOrder({ id: 'order-2' }));

      expect(useOrderStore.getState().activeOrders).toHaveLength(2);
    });

    it('adds to an empty list', () => {
      useOrderStore.getState().addOrder(createMockOrder({ id: 'order-1' }));

      expect(useOrderStore.getState().activeOrders).toHaveLength(1);
      expect(useOrderStore.getState().activeOrders[0]?.id).toBe('order-1');
    });

    it('clears error when adding an order', () => {
      useOrderStore.setState({ error: 'Previous error' });
      useOrderStore.getState().addOrder(createMockOrder());

      expect(useOrderStore.getState().error).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    it('updates the status of a specific order', () => {
      useOrderStore.getState().setOrders([
        createMockOrder({ id: 'order-1', status: 'pending' }),
        createMockOrder({ id: 'order-2', status: 'pending' }),
      ]);

      useOrderStore.getState().updateOrderStatus('order-1', 'preparing');

      const state = useOrderStore.getState();
      expect(state.activeOrders[0]?.status).toBe('preparing');
      expect(state.activeOrders[1]?.status).toBe('pending');
    });

    it('updates the updatedAt timestamp', () => {
      const originalDate = '2026-01-15T10:00:00Z';
      useOrderStore.getState().setOrders([
        createMockOrder({ id: 'order-1', updatedAt: originalDate }),
      ]);

      useOrderStore.getState().updateOrderStatus('order-1', 'ready');

      const updatedAt = useOrderStore.getState().activeOrders[0]?.updatedAt;
      expect(updatedAt).not.toBe(originalDate);
    });

    it('does not affect orders with different ids', () => {
      useOrderStore.getState().setOrders([
        createMockOrder({ id: 'order-1', status: 'pending' }),
      ]);

      useOrderStore.getState().updateOrderStatus('nonexistent', 'completed');

      expect(useOrderStore.getState().activeOrders[0]?.status).toBe('pending');
    });

    it('can transition through the full order lifecycle', () => {
      useOrderStore.getState().setOrders([
        createMockOrder({ id: 'order-1', status: 'pending' }),
      ]);

      useOrderStore.getState().updateOrderStatus('order-1', 'preparing');
      expect(useOrderStore.getState().activeOrders[0]?.status).toBe('preparing');

      useOrderStore.getState().updateOrderStatus('order-1', 'ready');
      expect(useOrderStore.getState().activeOrders[0]?.status).toBe('ready');

      useOrderStore.getState().updateOrderStatus('order-1', 'served');
      expect(useOrderStore.getState().activeOrders[0]?.status).toBe('served');

      useOrderStore.getState().updateOrderStatus('order-1', 'completed');
      expect(useOrderStore.getState().activeOrders[0]?.status).toBe('completed');
    });
  });

  describe('removeOrder', () => {
    it('removes an order by id', () => {
      useOrderStore.getState().setOrders([
        createMockOrder({ id: 'order-1' }),
        createMockOrder({ id: 'order-2' }),
      ]);

      useOrderStore.getState().removeOrder('order-1');

      const state = useOrderStore.getState();
      expect(state.activeOrders).toHaveLength(1);
      expect(state.activeOrders[0]?.id).toBe('order-2');
    });

    it('does nothing when removing a nonexistent order', () => {
      useOrderStore.getState().setOrders([
        createMockOrder({ id: 'order-1' }),
      ]);

      useOrderStore.getState().removeOrder('nonexistent');

      expect(useOrderStore.getState().activeOrders).toHaveLength(1);
    });

    it('can remove the last order leaving an empty list', () => {
      useOrderStore.getState().setOrders([createMockOrder({ id: 'order-1' })]);

      useOrderStore.getState().removeOrder('order-1');

      expect(useOrderStore.getState().activeOrders).toHaveLength(0);
    });
  });
});
