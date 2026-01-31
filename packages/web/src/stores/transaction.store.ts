import { create } from 'zustand';
import type { Transaction } from '@/types/transaction.types';

interface TransactionState {
  recentTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  recentTransactions: [],
  isLoading: false,
  error: null,
  setTransactions: (transactions) => set({ recentTransactions: transactions, error: null }),
  addTransaction: (transaction) =>
    set((state) => ({
      recentTransactions: [transaction, ...state.recentTransactions],
      error: null,
    })),
  clearTransactions: () => set({ recentTransactions: [], error: null }),
}));
