import { describe, it, expect, beforeEach } from 'vitest';
import { useInventoryStore } from '../inventory.store';
import type { StockLevel } from '@/types/inventory.types';

function createMockStockLevel(overrides: Partial<StockLevel> = {}): StockLevel {
  return {
    id: 'stock-1',
    productId: 'prod-1',
    productName: 'Nasi Goreng',
    sku: 'NG-001',
    currentStock: 50,
    minStock: 10,
    maxStock: 200,
    outletId: 'outlet-1',
    updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('inventory.store', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      stockLevels: [],
      lowStockAlerts: [],
      isLoading: false,
    });
  });

  describe('setStockLevels', () => {
    it('sets the list of stock levels', () => {
      const levels = [
        createMockStockLevel({ id: 'stock-1', productId: 'prod-1' }),
        createMockStockLevel({ id: 'stock-2', productId: 'prod-2' }),
      ];

      useInventoryStore.getState().setStockLevels(levels);

      expect(useInventoryStore.getState().stockLevels).toHaveLength(2);
    });

    it('replaces existing stock levels', () => {
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'old' }),
      ]);
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'new' }),
      ]);

      const state = useInventoryStore.getState();
      expect(state.stockLevels).toHaveLength(1);
      expect(state.stockLevels[0]?.productId).toBe('new');
    });
  });

  describe('updateStockLevel', () => {
    it('updates the stock quantity for a specific product and outlet', () => {
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'prod-1', outletId: 'outlet-1', currentStock: 50 }),
        createMockStockLevel({ productId: 'prod-2', outletId: 'outlet-1', currentStock: 30 }),
      ]);

      useInventoryStore.getState().updateStockLevel('prod-1', 'outlet-1', 45);

      const state = useInventoryStore.getState();
      expect(state.stockLevels[0]?.currentStock).toBe(45);
      expect(state.stockLevels[1]?.currentStock).toBe(30);
    });

    it('updates the updatedAt timestamp', () => {
      const originalDate = '2026-01-15T10:00:00Z';
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'prod-1', outletId: 'outlet-1', updatedAt: originalDate }),
      ]);

      useInventoryStore.getState().updateStockLevel('prod-1', 'outlet-1', 25);

      const updatedAt = useInventoryStore.getState().stockLevels[0]?.updatedAt;
      expect(updatedAt).not.toBe(originalDate);
    });

    it('does not update stock for a different outlet', () => {
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'prod-1', outletId: 'outlet-1', currentStock: 50 }),
        createMockStockLevel({ productId: 'prod-1', outletId: 'outlet-2', currentStock: 30 }),
      ]);

      useInventoryStore.getState().updateStockLevel('prod-1', 'outlet-1', 10);

      const state = useInventoryStore.getState();
      expect(state.stockLevels[0]?.currentStock).toBe(10);
      expect(state.stockLevels[1]?.currentStock).toBe(30);
    });

    it('does nothing when product does not exist', () => {
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'prod-1', currentStock: 50 }),
      ]);

      useInventoryStore.getState().updateStockLevel('nonexistent', 'outlet-1', 0);

      expect(useInventoryStore.getState().stockLevels[0]?.currentStock).toBe(50);
    });

    it('can set stock to zero', () => {
      useInventoryStore.getState().setStockLevels([
        createMockStockLevel({ productId: 'prod-1', outletId: 'outlet-1', currentStock: 50 }),
      ]);

      useInventoryStore.getState().updateStockLevel('prod-1', 'outlet-1', 0);

      expect(useInventoryStore.getState().stockLevels[0]?.currentStock).toBe(0);
    });
  });

  describe('setLowStockAlerts', () => {
    it('sets low stock alerts', () => {
      const alerts = [
        { productId: 'prod-1', productName: 'Nasi Goreng', currentStock: 5, minStock: 10, outletId: 'outlet-1' },
        { productId: 'prod-2', productName: 'Mie Ayam', currentStock: 3, minStock: 10, outletId: 'outlet-1' },
      ];

      useInventoryStore.getState().setLowStockAlerts(alerts);

      expect(useInventoryStore.getState().lowStockAlerts).toHaveLength(2);
    });

    it('replaces existing alerts', () => {
      useInventoryStore.getState().setLowStockAlerts([
        { productId: 'prod-1', productName: 'Old', currentStock: 5, minStock: 10, outletId: 'outlet-1' },
      ]);
      useInventoryStore.getState().setLowStockAlerts([
        { productId: 'prod-2', productName: 'New', currentStock: 2, minStock: 10, outletId: 'outlet-1' },
      ]);

      const state = useInventoryStore.getState();
      expect(state.lowStockAlerts).toHaveLength(1);
      expect(state.lowStockAlerts[0]?.productName).toBe('New');
    });

    it('can set to empty array to clear alerts', () => {
      useInventoryStore.getState().setLowStockAlerts([
        { productId: 'prod-1', productName: 'Item', currentStock: 1, minStock: 10, outletId: 'outlet-1' },
      ]);

      useInventoryStore.getState().setLowStockAlerts([]);

      expect(useInventoryStore.getState().lowStockAlerts).toHaveLength(0);
    });
  });
});
