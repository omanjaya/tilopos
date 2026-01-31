import { describe, it, expect, beforeEach } from 'vitest';
import { useTransactionStore } from '../transaction.store';
import type { Transaction } from '@/types/transaction.types';

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    transactionNumber: 'TXN-001',
    status: 'completed',
    subtotal: 50000,
    discountAmount: 0,
    taxAmount: 5500,
    serviceCharge: 2500,
    totalAmount: 58000,
    paidAmount: 60000,
    changeAmount: 2000,
    customerName: null,
    employeeName: 'Cashier A',
    outletId: 'outlet-1',
    items: [],
    payments: [],
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('transaction.store', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      recentTransactions: [],
      isLoading: false,
      error: null,
    });
  });

  describe('setTransactions', () => {
    it('sets the list of recent transactions', () => {
      const transactions = [
        createMockTransaction({ id: 'txn-1' }),
        createMockTransaction({ id: 'txn-2' }),
      ];

      useTransactionStore.getState().setTransactions(transactions);

      expect(useTransactionStore.getState().recentTransactions).toHaveLength(2);
      expect(useTransactionStore.getState().recentTransactions[0]?.id).toBe('txn-1');
    });

    it('replaces existing transactions', () => {
      useTransactionStore.getState().setTransactions([createMockTransaction({ id: 'old' })]);
      useTransactionStore.getState().setTransactions([createMockTransaction({ id: 'new' })]);

      const state = useTransactionStore.getState();
      expect(state.recentTransactions).toHaveLength(1);
      expect(state.recentTransactions[0]?.id).toBe('new');
    });

    it('clears error when setting transactions', () => {
      useTransactionStore.setState({ error: 'Something went wrong' });
      useTransactionStore.getState().setTransactions([]);

      expect(useTransactionStore.getState().error).toBeNull();
    });
  });

  describe('addTransaction', () => {
    it('adds a transaction to the beginning of the list', () => {
      useTransactionStore.getState().setTransactions([createMockTransaction({ id: 'txn-1' })]);
      useTransactionStore.getState().addTransaction(createMockTransaction({ id: 'txn-2' }));

      const state = useTransactionStore.getState();
      expect(state.recentTransactions).toHaveLength(2);
      expect(state.recentTransactions[0]?.id).toBe('txn-2');
    });

    it('adds to an empty list', () => {
      useTransactionStore.getState().addTransaction(createMockTransaction({ id: 'txn-1' }));

      expect(useTransactionStore.getState().recentTransactions).toHaveLength(1);
    });

    it('clears error when adding a transaction', () => {
      useTransactionStore.setState({ error: 'Previous error' });
      useTransactionStore.getState().addTransaction(createMockTransaction());

      expect(useTransactionStore.getState().error).toBeNull();
    });
  });

  describe('clearTransactions', () => {
    it('removes all transactions', () => {
      useTransactionStore.getState().setTransactions([
        createMockTransaction({ id: 'txn-1' }),
        createMockTransaction({ id: 'txn-2' }),
      ]);

      useTransactionStore.getState().clearTransactions();

      expect(useTransactionStore.getState().recentTransactions).toHaveLength(0);
    });

    it('clears error on clear', () => {
      useTransactionStore.setState({ error: 'Some error' });
      useTransactionStore.getState().clearTransactions();

      expect(useTransactionStore.getState().error).toBeNull();
    });
  });
});
