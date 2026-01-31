import { create } from 'zustand';
import type { Order, OrderStatus } from '@/types/order.types';

interface OrderState {
  activeOrders: Order[];
  isLoading: boolean;
  error: string | null;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  removeOrder: (orderId: string) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  activeOrders: [],
  isLoading: false,
  error: null,
  setOrders: (orders) => set({ activeOrders: orders, error: null }),
  addOrder: (order) =>
    set((state) => ({
      activeOrders: [...state.activeOrders, order],
      error: null,
    })),
  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      activeOrders: state.activeOrders.map((order) =>
        order.id === orderId
          ? { ...order, status, updatedAt: new Date().toISOString() }
          : order,
      ),
    })),
  removeOrder: (orderId) =>
    set((state) => ({
      activeOrders: state.activeOrders.filter((order) => order.id !== orderId),
    })),
}));
