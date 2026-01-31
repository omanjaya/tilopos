import { create } from 'zustand';
import type { StockLevel } from '@/types/inventory.types';

interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  outletId: string;
}

interface InventoryState {
  stockLevels: StockLevel[];
  lowStockAlerts: LowStockAlert[];
  isLoading: boolean;
  setStockLevels: (stockLevels: StockLevel[]) => void;
  updateStockLevel: (productId: string, outletId: string, newQuantity: number) => void;
  setLowStockAlerts: (alerts: LowStockAlert[]) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  stockLevels: [],
  lowStockAlerts: [],
  isLoading: false,
  setStockLevels: (stockLevels) => set({ stockLevels }),
  updateStockLevel: (productId, outletId, newQuantity) =>
    set((state) => ({
      stockLevels: state.stockLevels.map((level) =>
        level.productId === productId && level.outletId === outletId
          ? { ...level, currentStock: newQuantity, updatedAt: new Date().toISOString() }
          : level,
      ),
    })),
  setLowStockAlerts: (alerts) => set({ lowStockAlerts: alerts }),
}));
